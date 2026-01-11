interface RedactableTextProps {
  children: React.ReactNode;
  length: number;
}

const RedactableText: React.FC<RedactableTextProps> = (props) => {
  return props.children == "[REDACTED]" ? (
    <span className="text-black bg-black">{"0".repeat(props.length)}</span>
  ) : (
    props.children
  );
};

export default RedactableText;
