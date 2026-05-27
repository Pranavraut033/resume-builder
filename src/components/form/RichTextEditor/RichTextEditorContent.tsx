import { sanitizeHtml } from "@/lib/htmlUtils";

type Props = {
  content: string;
  className: string;
};

const RichTextEditorContent: React.FC<Props> = ({ content, className }) => {
  return (
    <div className={`${className} w-full`}>
      <div
        className="rte-content p-0! break-normal wrap-anywhere whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
      />
    </div>
  );
};

export default RichTextEditorContent;
