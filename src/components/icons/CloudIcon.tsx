import { JSX } from "react";

type Props = JSX.IntrinsicElements["svg"];

const CloudIcon: React.FC<Props> = (props) => {
  return (
    <svg
      fill="currentColor"
      height="1em"
      style={{ ...props.style, flex: "none", lineHeight: 1 }}
      viewBox="0 0 24 24"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Resume Builder Cloud</title>
      <path d="M6.5 19a4.5 4.5 0 01-.5-8.973 5.5 5.5 0 0110.653-2.02A4.5 4.5 0 0117.5 19h-11z" />
    </svg>
  );
};

export default CloudIcon;
