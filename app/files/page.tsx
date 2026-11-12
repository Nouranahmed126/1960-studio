"use client";
import {useEffect} from "react";
export default function FilesRedirect(){useEffect(()=>{window.location.replace("/submissions")},[]);return <main dir="rtl" style={{padding:30}}><p>تم دمج الملفات في قسم التسليمات.</p><a href="/submissions">فتح التسليمات</a></main>}