import { redirect } from "next/navigation";

/** Legacy URL — create project is a centered dialog on the projects list. */
export default function NewGalleryPage() {
  redirect("/dashboard/galleries?new=1");
}
