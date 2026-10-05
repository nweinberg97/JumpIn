import { getParams, navigate, useLocation } from "./router";

export function useRouter() {
  return {
    push: (h: string) => navigate(h),
    replace: (h: string) => navigate(h, true),
    back: () => history.back(),
    refresh: () => {},
  };
}
export const usePathname = () => useLocation();
export function useParams<T>() {
  useLocation();
  return getParams() as T;
}
