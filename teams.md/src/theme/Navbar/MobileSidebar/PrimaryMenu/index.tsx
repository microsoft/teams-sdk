import React from 'react';
import { useThemeConfig } from '@docusaurus/theme-common';
import { useNavbarMobileSidebar } from '@docusaurus/theme-common/internal';
import NavbarItem from '@theme/NavbarItem';

function useNavbarItems() {
  return useThemeConfig().navbar.items;
}

export default function NavbarMobilePrimaryMenu(): React.JSX.Element {
  const mobileSidebar = useNavbarMobileSidebar();
  const items = useNavbarItems();

  // Filter out Blog — it stays visible in the navbar header on mobile.
  // CLI and other items appear here in the hamburger menu.
  const mobileItems = items.filter(
    (item: any) => item.to !== '/blog'
  );

  return (
    <ul className="menu__list">
      {mobileItems.map((item, i) => (
        <NavbarItem
          mobile
          {...item}
          onClick={() => mobileSidebar.toggle()}
          key={i}
        />
      ))}
    </ul>
  );
}
