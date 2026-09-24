/**
 * Router in memoria per i test, sopra @tanstack/react-router.
 *
 * I test sono nati con react-router (`MemoryRouter`, `Routes`, `Route`,
 * `useNavigationType`): dopo il passaggio a TanStack Start l'app non ha piu'
 * quei componenti, e questo modulo li ricostruisce con la stessa forma,
 * cosi' i test esercitano il router vero dell'app e non una copia.
 */
import {
  Children,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useRouter,
  useRouterState,
  type AnyRoute,
} from "@tanstack/react-router";

type RouteProps = { path: string; element: ReactNode };

/** Segnaposto dichiarativo: lo legge `MemoryRouter`, non si rende mai da solo. */
export function Route(_props: RouteProps): null {
  return null;
}

/** Contenitore delle `Route`: come `Route`, e' solo una dichiarazione. */
export function Routes(_props: { children: ReactNode }): null {
  return null;
}

/** `:param` diventa `$param`, `*` diventa lo splat `$`. */
function toTanstackPath(path: string): string {
  return path
    .split("/")
    .map((seg) => (seg.startsWith(":") ? `$${seg.slice(1)}` : seg === "*" ? "$" : seg))
    .join("/");
}

function collectRoutes(children: ReactNode): RouteProps[] | null {
  let found: RouteProps[] | null = null;
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === Routes) {
      found = [];
      Children.forEach((child as ReactElement<{ children: ReactNode }>).props.children, (r) => {
        if (isValidElement(r) && r.type === Route) found!.push(r.props as RouteProps);
      });
    }
  });
  return found;
}

function buildRouter(children: ReactNode, initialEntries: string[]) {
  const declared = collectRoutes(children);
  const root = createRootRoute({ component: () => (declared ? <Outlet /> : <>{children}</>) });
  const leaves: AnyRoute[] = declared
    ? declared.map((r) =>
        createRoute({
          getParentRoute: () => root,
          path: toTanstackPath(r.path),
          component: () => <>{r.element}</>,
        }),
      )
    : [createRoute({ getParentRoute: () => root, path: "$", component: () => null })];
  return createRouter({
    routeTree: root.addChildren(leaves),
    history: createMemoryHistory({ initialEntries }),
    defaultPendingMinMs: 0,
  });
}

export function MemoryRouter({
  children,
  initialEntries = ["/"],
}: {
  children: ReactNode;
  initialEntries?: string[];
}) {
  const [router] = useState(() => buildRouter(children, initialEntries));
  return <RouterProvider router={router} />;
}

/** "POP" all'avvio, poi l'azione dell'ultima navigazione: "PUSH" o "REPLACE". */
export function useNavigationType(): "POP" | "PUSH" | "REPLACE" {
  const router = useRouter();
  useRouterState({ select: (s) => s.location.state });
  const [initialKey] = useState(() => router.history.location.state.__TSR_index);
  const { __TSR_index } = router.history.location.state;
  if (__TSR_index === initialKey && router.history.length <= 1) {
    return router.state.location.href === router.latestLocation.href &&
      lastAction.get(router) === "REPLACE"
      ? "REPLACE"
      : "POP";
  }
  return lastAction.get(router) ?? "PUSH";
}

const lastAction = new WeakMap<object, "PUSH" | "REPLACE">();
const origCreate = createRouter;
void origCreate;

/** Registra l'azione di ogni navigazione del router di test. */
export function trackActions(router: ReturnType<typeof createRouter>) {
  router.history.subscribe(({ action }) => {
    if (action.type === "PUSH" || action.type === "REPLACE") lastAction.set(router, action.type);
  });
}
