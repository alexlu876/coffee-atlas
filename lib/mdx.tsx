import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MdxBody({ source, className }: { source: string; className?: string }) {
  return (
    <div className={`prose prose-zinc dark:prose-invert max-w-none ${className ?? ""}`}>
      <Markdown remarkPlugins={[remarkGfm]}>{source}</Markdown>
    </div>
  );
}
