import type { AnchorHTMLAttributes } from "react";
import { hrefFor, navigate } from "./router";

export default function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const local = href.startsWith("/");
  return (
    <a
      href={local ? hrefFor(href) : href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (!local || e.defaultPrevented || e.metaKey || e.ctrlKey || rest.target) return;
        e.preventDefault();
        navigate(href);
      }}
    />
  );
}
