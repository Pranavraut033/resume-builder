import { JSX } from "react";

type Props = JSX.IntrinsicElements["svg"];

const RefreshCwIcon: React.FC<Props> = (props) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M21 2v6h-6" />
      <path d="M3 22v-6h6" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L3 8" />
      <path d="M3.51 15a9 9 0 0 0 14.85 3.36L21 16" />
    </svg>
  );
};

export default RefreshCwIcon;
