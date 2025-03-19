import { Navbar as HeroUINavbar, NavbarContent } from "@heroui/navbar";

export const AdminNavbar = () => {
  return (
    <HeroUINavbar
      maxWidth="xl"
      position="sticky"
      className="bg-black bg-opacity-10 backdrop-blur-xl"
    >
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
          <h1 className="mx-auto text-2xl">ADMIN DASHBOARD</h1>
      </NavbarContent>
    </HeroUINavbar>
  );
};
