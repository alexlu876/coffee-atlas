import { MDXRemote } from "next-mdx-remote/rsc";

export function MdxBody({ source, className }: { source: string; className?: string }) {
  return (
    <div className={`prose prose-zinc dark:prose-invert max-w-none ${className ?? ""}`}>
      <MDXRemote source={source} />
    </div>
  );
}
