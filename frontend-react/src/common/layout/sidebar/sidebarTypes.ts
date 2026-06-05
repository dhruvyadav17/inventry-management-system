export type SidebarMenuLink = {
  to: string;
  icon: string;
  label: string;
  permission: string;
};

export type SidebarMenuGroup = {
  group: string;
  items: SidebarMenuLink[];
};
