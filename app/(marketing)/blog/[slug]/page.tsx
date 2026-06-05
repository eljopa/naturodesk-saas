import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: _slug } = await params;
  // Future: fetch article by slug and return real metadata
  return { title: "Article" };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug: _slug } = await params;
  // Future: fetch article from CMS/DB
  notFound();
}
