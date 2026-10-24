import {
  IconAlphabetCyrillic,
  IconChalkboard,
  IconFeather,
  IconHome,
  IconLanguage,
  IconRepeat,
  IconSettings,
  IconShoppingBag,
  IconSparkles,
} from "@tabler/icons-react";
// Root import on purpose: core-ui shares `erxes-ui` as a Module Federation
// singleton keyed on the bare specifier, so deep imports would bundle a second
// private copy instead of reusing the host's.
import { NavigationMenuLinkItem, Sidebar } from "erxes-ui";
import manifest from "../../../erxes.json" with { type: "json" };

const base = `/${manifest.ui.path}`;

export const Navigation = () => (
  <Sidebar.Group>
    <Sidebar.GroupContent>
      <Sidebar.Menu>
        <NavigationMenuLinkItem name="Нүүр" icon={IconHome} path={base} />
        <NavigationMenuLinkItem name="A · Монгол бичиг" icon={IconAlphabetCyrillic} path={`${base}/cards`} />
        <NavigationMenuLinkItem name="B · Монгол хэл" icon={IconLanguage} path={`${base}/language`} />
        <NavigationMenuLinkItem name="C · Уран зохиол" icon={IconFeather} path={`${base}/literature`} />
        <NavigationMenuLinkItem name="B · Текст шалгах" icon={IconSparkles} path={`${base}/ai`} />
        <NavigationMenuLinkItem name="B · Алдаа засах" icon={IconRepeat} path={`${base}/review`} />
        <NavigationMenuLinkItem name="Онооны дэлгүүр" icon={IconShoppingBag} path={`${base}/shop`} />
        <NavigationMenuLinkItem name="Багшийн самбар" icon={IconChalkboard} path={`${base}/teacher`} />
        <NavigationMenuLinkItem name="Тохиргоо" icon={IconSettings} path={`${base}/settings`} />
      </Sidebar.Menu>
    </Sidebar.GroupContent>
  </Sidebar.Group>
);
