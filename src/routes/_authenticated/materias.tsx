import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/materias")({
  component: MateriasLayout,
});

function MateriasLayout() {
  return <Outlet />;
}