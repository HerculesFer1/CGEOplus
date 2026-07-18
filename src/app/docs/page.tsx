import { redirect } from "next/navigation";

import { DOCS_METODOLOGIA } from "@/lib/docs/metodologia";

/** `/docs` cai na primeira página da metodologia. */
export default function DocsIndexPage() {
  redirect(`/docs/${DOCS_METODOLOGIA[0].slug}`);
}
