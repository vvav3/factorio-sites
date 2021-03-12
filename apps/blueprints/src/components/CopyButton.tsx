import React, { useMemo, useState } from "react";
import { MdCheck, MdClose } from "react-icons/md";
import { IoMdClipboard } from "react-icons/io";
import { Button, ButtonProps } from "../components/Button";

const SUCCESS_ICON_DURATION = 2000;

export const CopyButton: React.FC<
  Omit<ButtonProps, "children"> & { content: string; label?: string }
> = ({ content, label, ...props }) => {
  const [loading, setLoading] = useState(false);
  const [iconType, setIconType] = useState<"success" | "error" | null>(null);

  const icon = useMemo(() => {
    switch (iconType) {
      case "success":
        return <MdCheck />;
      case "error":
        return <MdClose />;
      default:
        return <IoMdClipboard />;
    }
  }, [iconType]);

  const handleClick = async () => {
    setLoading(true);
    try {
      await navigator.clipboard.writeText(content);
      setIconType("success");
      setTimeout(() => setIconType(null), SUCCESS_ICON_DURATION);
      setLoading(false);
    } catch (err) {
      setIconType("error");
      setLoading(false);
    }
  };

  return (
    <Button
      css={{
        display: "inline-flex",
        minWidth: "128px",
      }}
      disabled={loading}
      {...props}
      onClick={handleClick}
    >
      <span className="icon" css={{ marginRight: "5px" }}>
        {icon}
      </span>
      {label || "copy"}
    </Button>
  );
};
