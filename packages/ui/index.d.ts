declare module "@repo/ui" {
  export * from "@heroui/button";
  export * from "@heroui/system";
  export { ThemeProvider as NextThemesProvider } from "next-themes";

}

// Опционально: объявление глобальных типов, если используется CSS
declare module "*.css" {
  const content: string;
  export default content;
}
