import { sanitizeHtml } from "@/lib/htmlUtils";
import "@/styles/rte.css";

type Props = {
  content: string;
  className: string;
};

const RichTextEditorContent: React.FC<Props> = ({ content, className }) => {
  return (
    <div className={`${className} w-full min-w-0`}>
      <div
        className="break-normal wrap-anywhere whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
      />
    </div>
  );
};

export default RichTextEditorContent;
