"use client";

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export const MobileMenu = ({ isOpen, onClose, children }: MobileMenuProps) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="mobile-menu-overlay" onClick={onClose} />
      <div className={`mobile-sidebar ${isOpen ? "open" : ""}`}>
        {children}
      </div>
    </>
  );
};

