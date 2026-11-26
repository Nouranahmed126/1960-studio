"use client";

import Link from "next/link";
import {useEffect, useState} from "react";
import {getSupabase} from "../lib/supabase-browser";
import {signStudioImages} from "../lib/studio-media";

type StudioClient = NonNullable<ReturnType<typeof getSupabase>>;
type CrewMember = {id: string; full_name: string};
type CrewPhoto = {user_id: string; photo_path: string | null};
type Keepsake = {id: number; title: string; image_path: string | null};
type Honor = {id: number; student_name: string};
type GalleryItem = {id: number; title: string | null; storage_path: string | null};
type RibbonItem = {id: string; label: string; image?: string};
type LoadedRibbon = {items: RibbonItem[]; unavailable: boolean};
type RibbonState =
  | {status: "loading" | "signed-out" | "restricted" | "unavailable"}
  | {status: "ready"; crew: LoadedRibbon; keepsakes: LoadedRibbon; honors: LoadedRibbon};

const ribbons = [
  {key: "crew", kind: "crew", label: "Studio Crew", href: "/crew", direction: "right"},
  {key: "keepsakes", kind: "artifact", label: "1960 Keepsakes", href: "/museum", direction: "left"},
  {key: "honors", kind: "honor", label: "Honors", href: "/honor-board", direction: "right"},
] as const;

function normalizeName(value: string) {
  return value.normalize("NFKC").replace(/[ـ\s]+/g, " ").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").trim().toLocaleLowerCase("ar");
}

async function loadRibbons(db: StudioClient): Promise<RibbonState> {
  const {data: {user}, error} = await db.auth.getUser();
  if (!user) return {status: error && error.name !== "AuthSessionMissingError" ? "unavailable" : "signed-out"};

  const profile = await db.from("profiles").select("app_role,approval_status").eq("id", user.id).maybeSingle();
  if (profile.error) return {status: "unavailable"};
  if (profile.data?.app_role !== "supervisor" && profile.data?.approval_status !== "approved") {
    return {status: "restricted"};
  }

  const [crew, details, props, honors, cassette] = await Promise.all([
    db.rpc("list_approved_crew"),
    db.from("crew_profiles").select("user_id,photo_path"),
    db.from("studio_props").select("id,title,image_path").neq("id", 2).order("created_at", {ascending: false}).limit(60),
    db.from("studio_honors").select("id,student_name").order("created_at", {ascending: false}).limit(100),
    db.from("project_gallery").select("id,title,storage_path").eq("id", 1).maybeSingle(),
  ]);

  const members = (crew.data ?? []) as CrewMember[];
  const crewPhotos = (details.data ?? []) as CrewPhoto[];
  const keepsakes = (props.data ?? []) as Keepsake[];
  const galleryItem = cassette.data as GalleryItem | null;
  const awardRows = (honors.data ?? []) as Honor[];

  const keepsakePaths = keepsakes.map(item => item.image_path);
  const photoByMember = new Map(crewPhotos.map(photo => [photo.user_id, photo.photo_path]));
  const [galleryPhotos, crewBucketPhotos] = await Promise.all([
    signStudioImages(db, "studio-gallery", [...keepsakePaths, galleryItem?.storage_path]),
    signStudioImages(db, "crew-photos", [...crewPhotos.map(photo => photo.photo_path), ...keepsakePaths]),
  ]);

  const crewItems = members.map(member => ({
    id: member.id,
    label: member.full_name,
    image: crewBucketPhotos.get(photoByMember.get(member.id) ?? ""),
  }));
  const crewByName = new Map<string, RibbonItem | null>();
  for (const member of crewItems) {
    const name = normalizeName(member.label);
    // An honor with a shared name cannot be matched to a unique portrait.
    crewByName.set(name, crewByName.has(name) ? null : member);
  }

  const keepsakeItems: RibbonItem[] = keepsakes.map(item => ({
    id: String(item.id),
    label: item.title,
    image: galleryPhotos.get(item.image_path ?? "") ?? crewBucketPhotos.get(item.image_path ?? ""),
  }));
  if (galleryItem?.storage_path) {
    keepsakeItems.push({
      id: "gallery-" + galleryItem.id,
      label: galleryItem.title || "1960 Archive",
      image: galleryPhotos.get(galleryItem.storage_path),
    });
  }

  return {
    status: "ready",
    crew: {items: crewItems, unavailable: !!crew.error},
    keepsakes: {items: keepsakeItems, unavailable: !!props.error || !!cassette.error},
    honors: {
      items: awardRows.map(award => ({
        id: String(award.id),
        label: award.student_name,
        image: crewByName.get(normalizeName(award.student_name))?.image,
      })),
      unavailable: !!honors.error,
    },
  };
}

export default function Ribbons() {
  const [state, setState] = useState<RibbonState>({status: "loading"});

  useEffect(() => {
    const db = getSupabase();
    if (!db) {
      setState({status: "unavailable"});
      return;
    }

    let active = true;
    let request = 0;
    let authRefresh: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      const current = ++request;
      try {
        const next = await loadRibbons(db);
        if (active && current === request) setState(next);
      } catch {
        if (active && current === request) setState({status: "unavailable"});
      }
    };

    void refresh();
    const channel = db.channel("home-ribbons-live")
      .on("postgres_changes", {event: "*", schema: "public", table: "crew_profiles"}, refresh)
      .on("postgres_changes", {event: "*", schema: "public", table: "studio_props"}, refresh)
      .on("postgres_changes", {event: "*", schema: "public", table: "studio_honors"}, refresh)
      .on("postgres_changes", {event: "*", schema: "public", table: "project_gallery"}, refresh)
      .subscribe();
    const {data: {subscription}} = db.auth.onAuthStateChange(event => {
      if (event === "INITIAL_SESSION") return;
      clearTimeout(authRefresh);
      if (event === "SIGNED_OUT") {
        request++;
        setState({status: "signed-out"});
        return;
      }
      authRefresh = setTimeout(() => void refresh(), 0);
    });
    const timer = setInterval(() => void refresh(), 45000);
    return () => {
      active = false;
      clearTimeout(authRefresh);
      clearInterval(timer);
      subscription.unsubscribe();
      void db.removeChannel(channel);
    };
  }, []);

  return <section className="reference-ribbons" aria-label="Studio highlights">
    {ribbons.map((row, index) => {
      const ribbon = state.status === "ready" ? state[row.key] : undefined;
      return <section className={`reference-ribbon ribbon-${index}`} key={row.key} aria-label={row.label}>
        <Link href={row.href} className="ribbon-heading">
          <span aria-hidden="true">{row.direction === "left" ? "←" : "→"}</span>
          <strong>{row.label}</strong>
        </Link>
        <div className="ribbon-window">
          {ribbon?.items.length ? <div className={`reference-ribbon-track ribbon-track-${index}`}>
            {[0, 1].map(copy => <div className="reference-ribbon-group" key={copy} aria-hidden={copy === 1}>
              {ribbon.items.map(item => <Link
                href={row.href}
                className={`ribbon-item ribbon-item-${row.kind}`}
                key={item.id}
                tabIndex={copy === 1 ? -1 : 0}
                aria-label={item.label}
              >
                {item.image && <img className={row.key === "keepsakes" ? "ribbon-artifact" : "ribbon-emblem"} src={item.image} alt="" loading="lazy"/>}
                {(row.key !== "keepsakes" || !item.image) && <bdi>{item.label}</bdi>}
              </Link>)}
            </div>)}
          </div> : <div className="ribbon-empty">
            {state.status === "loading" ? "Loading…" :
              state.status === "signed-out" ? <Link href="/login">Sign in to view</Link> :
              state.status === "restricted" ? "Approved members only" :
              state.status === "unavailable" || ribbon?.unavailable ? "Couldn’t load records" :
              "No records to display"}
          </div>}
        </div>
      </section>;
    })}
  </section>;
}
