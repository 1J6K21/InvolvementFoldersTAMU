import type { ReactNode } from "react";

interface Props {
  color?: "primary" | "secondary" | "danger" | "success" | "warning";
  children: ReactNode;
  onClose: () => void;
}

const Alert = ({ color = "primary", children, onClose }: Props) => {
  return (
    <div className={"alert alert-" + color + " dismissible fade show" }>
      <button
        type="button"
        className="btn-close"
        data-dismiss="alert"
        aria-label="Close"
        onClick={onClose}
      />
      {children}
    </div>
  );
};

export default Alert;
