import { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
  closeOnBackdropClick = false,
  closeOnEscape = true,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (closeOnEscape && e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/50 backdrop-blur-xs"
      onClick={() => {
        if (closeOnBackdropClick) {
          onClose();
        }
      }}
    >
      <div
        className="fixed inset-0"
        onClick={(e) => {
          e.stopPropagation();
          if (closeOnBackdropClick) {
            onClose();
          }
        }}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidth} max-h-[90vh] flex flex-col rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200 transition-all z-10 my-auto`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 pb-4">
          <h3 id="modal-title" className="text-xl font-bold text-gray-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-600"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="mt-4 flex-1 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
