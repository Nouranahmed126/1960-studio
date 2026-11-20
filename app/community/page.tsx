import type { Metadata } from "next";
import GalleryFeed from "../gallery/gallery-feed";
import "./community.css";

export const metadata: Metadata = { title: "مجتمع 1960" };

export default function CommunityPage() {
  return <GalleryFeed community />;
}
