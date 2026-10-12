# Krampus 0.2.0 – Android kiadási állapot

Első kiadási cél: kizárólag Android. Ez a dokumentum a megvalósított funkciókat és a még szükséges kiadási munkát külön kezeli. Publikálás nem történt.

## Megvalósítás

- Verziózott, validált helyi adatmodell és ellenőrzött migráció a korábbi két tárolási kulcsról.
- Mentési hibajelzés, korábbi ép helyi példány visszaállítása, sérült adatok megőrzése, teljes helyi törlés.
- Közös alkalmazásállapot és egymás után végrehajtott adatmutációk; árbevitel közben nincs mentés.
- Pontos pénzbevitel és egész századrészes számítás; nulla tényleges ár támogatása.
- Progress bar, tényleges költés, személyenkénti keretek összege, becsült végösszeg és szöveges túllépésjelzések.
- Opcionális ajándékötlet és kategória; a vásárlás visszavonása megőrzi az előző árat, de kizárja a költésből.
- Egységes beállításmentés, mentetlen változtatások védelme, reaktív nyelvállapot és teljes magyar/angol/német feliratkészlet.
- Megerősített pénznem- és vásárlásiév-váltás, automatikus árfolyamváltás és régi lista automatikus átvitele nélkül.
- Csak felhasználói bekapcsolási szándékra kért rendszerengedély; üres/kész listánál és kikapcsoláskor törölt emlékeztetők.
- Választható decemberi napok és időpont, következő emlékeztető, sorban frissített ütemezés és látható hibák.
- Android értesítési csatorna, fehér sziluettikon, monokróm launcherikon és egységes világos téma.
- Felolvasási címkék/állapotok, legalább 48 méretű érintési felületek, javított színkontraszt és görgethető űrlapok.
- Alkalmazáson belüli adatkezelési tájékoztató; Android release internetengedély eltávolítása és Firebase Messaging automatikus inicializálásának kikapcsolása.

## Automatizált ellenőrzések

Eredmények (2026. október 12.):

- [x] `npm run check`: TypeScript hibamentes, ESLint nulla hiba/figyelmeztetés, 16 célzott domain teszt sikeres.
- [x] Android JS/Hermes export.
- [x] Android prebuild: értesítési ikon konfiguráció, backup és offline release manifest generálása sikeres. A 96×96 értesítési és 108×108 monokróm ikon átlátszó háttéren fehér sziluett.
- [x] Mobilméretű böngészős alapfolyamat és újratöltés utáni megőrzés: 390×844 és 320×640 méreten; hibás/negatív bevitel, nulla ár, árjavítás, megtartott ár visszajelöléskor, nyelvváltás, költési figyelmeztetés és régi adatok migrációja. A natív próbát nem helyettesíti.
- [x] `git diff --check`.

Környezeti korlát: nincs konfigurált Android SDK/SDK_ROOT, adb vagy EAS-hitelesítés, ezért telepíthető APK/AAB és készülékes értesítési teszt ebben a munkamenetben nem készült. A natív forrásgenerálás sikeres; a release manifest végső összeolvasztását az APK/AAB készítésekor kell igazolni. A böngészős és Android-export buildben az elavult `baseline-browser-mapping` fejlesztői adatbázis figyelmeztetése megjelent; a böngészős exportban az Expo a webes pushfigyelő korlátozott támogatását is jelzi. Egyik sem TypeScript- vagy alkalmazásfutási hiba.

## Publikálás előtt szükséges

- [ ] Telepíthető preview APK készítése és valódi Android készülékes teszt.
- [ ] Production AAB készítése, aláírás és végső manifest/SDK-ellenőrzés. A release-csomagban nincs INTERNET, SYSTEM_ALERT_WINDOW, READ_EXTERNAL_STORAGE vagy WRITE_EXTERNAL_STORAGE engedély; a POST_NOTIFICATIONS és RECEIVE_BOOT_COMPLETED helyi emlékeztetőkhöz szükséges.
- [ ] Értesítés próba Android 13+ rendszeren: engedélyezés, megtagadás, engedély visszavonása, bezárt app, lezárt képernyő, újraindított telefon.
- [ ] Legalább egy korábbi támogatott Android-verzió ellenőrzése; akkumulátorkímélő/Doze mellett késleltetett emlékeztető működésének vizsgálata. Nincs percre pontos kézbesítési ígéret vagy külön exact-alarm engedélykérés.
- [ ] Teljesen kész, üres és részben kész lista értesítési viselkedése; nap-/évhatár és időzóna-váltás ellenőrzése.
- [ ] Valódi korábbi telepítésről frissítés, migráció, készülékes adatmegőrzés és hibahelyreállítás.
- [ ] Magyar/angol/német alapfolyamat, kis képernyő, nagy betűméret, TalkBack és Android edge-to-edge teszt.
- [ ] Mentetlen beállításnál tabváltás, hardveres visszalépés és értesítésre koppintás: mentés/elvetés/mégse.
- [ ] Rendszermentés visszaállítása és a helyi törlés hatásának ellenőrzése; a korábbi rendszermentések kezelése nem az app feladata.
- [ ] Végleges kiadói megnevezés, támogatási e-mail-cím és nyilvános adatkezelési URL. A felhasználó kérésére egyelőre nyitott tételek.
- [ ] Play Console adatbiztonsági és tartalmi nyilatkozat, áruházi leírás, képernyőképek és tesztelési/kiadási csatorna véglegesítése.

APK/AAB készítéséhez helyi Android SDK/NDK és buildeszközök, vagy hitelesített Expo/EAS hozzáférés szükséges. A JS-export és a prebuild nem helyettesítik a telepíthető buildet vagy a végső manifest-merge ellenőrzését.

## Későbbi kör

Kézi export/import, teljes szezonarchívum, több ajándék egy személyhez és teljes sötét téma az elfogadott terv szerint későbbi fejlesztések.
