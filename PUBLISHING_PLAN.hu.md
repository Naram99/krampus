# Krampus – javítási és kiadási terv

Állapot: jóváhagyott terv, megvalósítás a `feat/publishing-readiness` branchen. Az első kiadás kizárólag Androidra készül; az ellenőrzési eredmények és nyitott kiadási tételek a `docs/RELEASE.hu.md` fájlban szerepelnek.

## Cél és terjedelem

Megbízható, magyarul, angolul és németül használható karácsonyi ajándéktervező, amely helyben tárolja az adatokat és helyi értesítéseket használ. A terv nem igényel felhasználói fiókot, backend szervert, analitikát vagy árfolyamszolgáltatást.

Az első kiadásba a jelenlegi funkciók javítása, a felsorolt használhatósági fejlesztések és a kiadási ellenőrzések kerülnek. Kézi export/import, teljes szezonarchívum és több ajándék egy személyhez külön, későbbi fejlesztési kör.

## 1. Helyi adattárolás és közös alkalmazásállapot – kiadás előtt szükséges

Érintett: `utils/storage.ts`, `types/index.ts`, `app/_layout.tsx`, a három tab képernyője; új közös állapotkezelő és adatvalidációs modul.

- A tárolási réteg csak adatot olvas és ír; az értesítéseket külön szolgáltatás kezeli. Megszűnik a tárolás és az értesítések kölcsönös importja.
- A képernyők egy közös, betöltött állapotból dolgoznak. Az inicializálás befejezéséig betöltési állapot látszik; betöltési hiba nem válik üres, szerkeszthető listává.
- Verziózott adatszerkezet, amely tartalmazza a személyeket, beállításokat és az aktív vásárlási évet. A jelenlegi két tárolási kulcs migrációja megőrzi a neveket, ajándékokat, összegeket és vásárlási állapotokat.
- A migráció mentett forráspéldányból, ellenőrzött új adatokkal történik. A régi adatok csak az új mentés visszaolvasása és ellenőrzése után tekinthetők feldolgozottnak.
- Hiányzó opcionális beállítások alapértéket kapnak. Hibás típus, nem véges összeg vagy sérült JSON helyreállítási állapotot eredményez; nincs csendes adatcsere.
- Mentési hibánál megmarad a bevitel, és megjelenik az újrapróbálás. A felület csak sikeres adatmentés után zárja be a szerkesztőt vagy jelzi a sikert.
- A teljes adatállomány módosításai egymás után futnak, az aktuális állapotból számolva. A mentés alatt a művelet nem indítható újra; azonosítókhoz ütközésbiztos megoldás kell.
- Az adatmentés és az értesítésfrissítés eredménye különválik: sikeres adatmentés után egy ütemezési hiba nem jelent adatvesztést, de látható hibajelzést és újrapróbálást kap.

Elfogadási feltételek:

- Újraindítás és alkalmazásfrissítés után megmarad minden korábbi adat.
- Szimulált írási hiba nem eredményez sikerjelzést; sérült tárolás nem írható felül észrevétlenül.
- Gyors, egymást követő műveletek és tabváltás nem veszítik el a legutóbbi változtatásokat.
- A meglévő adatok migrációja ellenőrzött és megismételhető, megszakítás esetén is.

## 2. Pénzbevitel, ármentés és pénznemváltás – kiadás előtt szükséges

Érintett: `utils/currency.ts`, `types/index.ts`, `app/(tabs)/index.tsx`, `people.tsx`, `settings.tsx`.

- Közös pénzfeldolgozó fogadja a tizedespontot, tizedesvesszőt és az ezreselválasztó szóközt, beleértve a nem törhető szóközt is. A teljes szöveget ellenőrzi; nem fogad el csak egy érvényes előtagot.
- A kétértelmű elválasztók, túl sok tizedesjegy, negatív, nem véges és túl nagy összegek hibát adnak. Az üres érték nem változik automatikusan nullává.
- Az összegek egész számú századrészben tárolódnak, hogy az összeadás és a keretellenőrzés ne lebegőpontos hibán múljon. Az adatmodell mezői jelzik az egységet, a migráció ezt figyelembe veszi.
- Tényleges árként a 0 megengedett; a személyenkénti és alapértelmezett keret pozitív. A teljes keretnél a „Nincs keret” külön kapcsoló; a korábbi 0 erre migrálódik.
- HUF megjelenítése egész összegnél tizedesjegy nélkül, törtrésznél látható tizedesekkel történik. Példa: `10 000 Ft`, `12,99 €`. Az összeg formátuma a választott nyelvhez igazodik.
- Az ár szerkesztés közben szöveg marad. Mentéskor egyszer történik validáció, adatmentés és szükség esetén értesítésfrissítés.
- A vásárlás visszavonásakor az előző ár megmarad a következő szerkesztéshez, de nem számít bele az elköltött összegbe. Újbóli megjelöléskor szerkeszthető előtöltésként jelenik meg.
- A pénznem a teljes listára vonatkozik. Meglévő pénzügyi adatok mellett váltáskor a felület példával jelzi: „10 000 Ft → 10 000 €; az összegek száma nem változik”. A váltás csak a jóváhagyott mentéssel történik; elvetés esetén minden változatlan marad. Az automatikus átváltás későbbi, külön termékdöntés lenne.

Elfogadási feltételek:

- `12,99` és `12.99` ugyanazt az összeget jelentik; `10 000` tízezer.
- Üres tényleges ár, `abc`, `-100`, `12xyz` és nem támogatott pontosság nem menthető.
- A 0 ár nem vész el; `0,10 + 0,20` pontosan `0,30`.
- Gépelés közben nincs adatmentés vagy értesítésütemezés.
- Pénznemváltás nem módosít összegeket észrevétlenül.

## 3. Értesítések – kiadás előtt szükséges javítás és használhatósági fejlesztés

Érintett: `utils/notifications.ts`, `app/_layout.tsx`, `app/(tabs)/settings.tsx`, az új közös állapotkezelő, `app.json`, fordítások.

- Az Expo SDK aktuális API-ja szerint javítjuk a handlert és a dátumtriggert. Androidon megfelelő értesítési csatornát és külön, a platformhoz megfelelő értesítési ikont használunk.
- Első induláskor nincs engedélykérő ablak. A felhasználó értesítésbekapcsolási szándékakor kérünk rendszerengedélyt; Androidon az ehhez szükséges csatorna előbb létrejön.
- A beállítás megkülönbözteti a felhasználó szándékát és a rendszerengedély állapotát. Megtagadáskor az app jelzi, hogy az emlékeztetők nem aktívak, és felajánlja a rendszerbeállítások megnyitását. Nem kér engedélyt minden adatmentésnél.
- Az alapértelmezett napok december 1., 10., 15., 20., 22., 23., 24., 09:00 időponttal. A felhasználó napokat kapcsolhat ki/be, és közös napi időpontot választhat. Látszik a következő ütemezett emlékeztető.
- Csak bekapcsolt értesítés, megfelelő engedély és legalább egy meg nem vásárolt ajándék mellett ütemezünk. Üres vagy kész listánál, valamint kikapcsoláskor a várakozó emlékeztetők törlődnek.
- A naptár az aktív vásárlási évhez kötődik. Elmúlt időpontot nem ütemezünk. December 24. után nem visszük át automatikusan a régi listát a következő évre: az új év aktiválása külön művelet, amely világosan jelzi, hogy a meglévő lista marad. Teljes archiválás később készül.
- Értesítésfrissítés csak a vásárlási állapot, lista, nyelv vagy értesítési beállítás releváns változásakor történik. Pusztán az ár javítása nem ütemez újra. A frissítések egy sorban futnak, azonosítható értesítésekkel, ellenőrizhető hibakezeléssel.
- Induláskor és előtérbe visszatéréskor egyeztetjük az engedélyeket és a várakozó értesítéseket; ez nem indít új engedélykérést. Időzóna-váltás után az app következő aktiválásakor a helyi időhöz igazítjuk őket.
- Az emlékeztető szövege nem tartalmaz személynevet vagy ajándéknevet. Rákoppintáskor a főoldal nyílik meg. A haladás az ütemezéskori állapotot tükrözi; az app a változtatások után frissíti a várakozó üzeneteket.

Elfogadási feltételek:

- Kikapcsolt állapotban nincs engedélykérés vagy várakozó emlékeztető.
- Üres listánál és 100%-os készültségnél nincs új ajándékvásárlási emlékeztető; az utolsó ajándék kipipálása törli a várakozókat.
- Megtagadás, engedély utólagos visszavonása és ütemezési hiba látható, helyreállítható állapotot ad.
- December 24. 09:00 környéke, december 25., január 1. és kézi évváltás helyes eredményt ad, ismételt frissítéskor is.
- Valós készüléken, bezárt app és lezárt képernyő mellett is érkezik a helyi emlékeztető, a rendszer engedélyei és időzítési korlátai szerint. Percre pontos kézbesítést nem ígérünk.

## 4. Főoldal és költési visszajelzés – első kiadásba javasolt

Érintett: `app/(tabs)/index.tsx`, közös statisztikaszámítás, fordítások, `utils/theme.ts`.

- A főoldal tetején valódi haladási sáv jelenik meg, például: „3/8 ajándék megvásárolva · 38%”. Üres listánál hozzáadásra ösztönző állapot, kész listánál egyértelmű készültségi üzenet látszik.
- Külön érték az összes személyenkénti keret, a tényleges költés és a becsült végösszeg.
- Becsült végösszeg = megvásárolt ajándékok tényleges ára + hátralévő ajándékok személyenkénti kerete. A felület jelzi, hogy ez keretek alapján számított becslés.
- A globális keret túllépése konkrét szöveget és ikont kap: „5 000 Ft-tal túllépted a keretet”. A becsült túllépés külön szöveggel jelenik meg, nem tényként.
- Személyenként is látszik a tényleges ár és az adott keret különbsége, túllépéskor szöveggel és ikonnal.
- Korlátlan globális keretnél is látható a költés, de nincs globális túllépésjelzés. A készültség és a költés egymástól független marad: egy kész lista lehet kereten felüli.
- A még hiányzó ajándékok maradnak elöl. A főoldali üres állapotból közvetlenül elérhető a személy hozzáadása.

Elfogadási feltételek:

- A haladási sáv, számláló és felolvasott állapot ugyanazt mutatja.
- A kerettel pontosan egyező költés nem túllépés; az első egységnyi többlet már igen.
- A tényleges és becsült túllépés megkülönböztethető, keret nélküli és nulla költésű listánál is.

## 5. Felvitel, beállítások és hozzáférhetőség – első kiadásba javasolt

Érintett: mindhárom képernyő, tablayout, gyökérlayout, fordítások, témaszínek.

- Új személynél a név kötelező, a kategória és ajándéknév opcionális. Ha még nincs ötlet, a kártya ezt érthetően jelzi.
- Űrlaphibák a megfelelő mezőnél jelennek meg. Sikertelen mentéskor a bevitel megmarad; hosszú név, kis képernyő és megnyitott billentyűzet mellett is elérhető a mentés.
- A beállítások módosításai egy szerkesztési állapotban gyűlnek, és egy „Mentés” gombbal érvényesülnek. A kapcsolók és választók sem mentenek külön. Mentetlen változásokkal kilépéskor a felület mentést vagy elvetést kínál.
- A nyelv minden tabon, fejlécben, hibában és párbeszédben egységesen frissül. A nyelvállapot reaktív lesz; a korábbi globális változó nem marad az egyetlen forrás. Az angolul rögzített gombfeliratokat lefordítjuk.
- Új telepítéskor a támogatott készüléknyelv az alap, egyébként angol. A választott pénznem világosan látszik, a felhasználó beállíthatja; nincs automatikus következtetés a nyelvből a későbbi pénznemváltásra.
- Az ikonoknak beszédes felolvasási címke, a checkboxnak és kapcsolóknak megfelelő szerep és állapot kell. A haladási sáv értéke képernyőolvasóval is elérhető.
- A kisebb szövegek kontrasztja legalább 4,5:1; a nyomható felületek legalább 48×48 méretűek. A költségállapot nem csak színen keresztül érthető.
- Ellenőrizzük a nagy betűméretet, TalkBack/VoiceOver működést, a biztonságos képernyőterületeket és az Android edge-to-edge megjelenítést.
- Az első kiadás egységes világos témát használ. Az alkalmazáskonfiguráció ezt tükrözi; teljes sötét téma külön későbbi fejlesztés.

Elfogadási feltételek:

- Személy hozzáadható kategória és ajándékötlet nélkül.
- Mindhárom nyelven érthető és teljes minden alapfolyamat; nincs véletlen angol felirat magyar vagy német módban.
- Mentetlen beállítás nem érvényesül észrevétlenül és nem vész el figyelmeztetés nélkül.
- Nagy betűmérettel, kis képernyőn és képernyőolvasóval is végigvihető a hozzáadás, vásárlásjelölés, árjavítás és beállításmentés.

## 6. Kiadási előkészítés és ellenőrzés – kiadás előtt szükséges

- Friss README a valódi indítási, ellenőrzési és buildlépésekkel; a nem létező reset-script hivatkozásának rendezése.
- Verziók egységesítése, alkalmazásazonosítók és production buildbeállítások ellenőrzése. iOS cél esetén végleges `bundleIdentifier` és iPad-megjelenítés ellenőrzése, mert a jelenlegi konfiguráció támogatja a táblagépet.
- Android alkalmazásikon, adaptív/monokróm ikon és értesítési ikon vizuális ellenőrzése; külön megfelelő képfájlok, ahol szükséges.
- Rövid adatkezelési tájékoztató az alkalmazásban és az áruházhoz használható formában: helyi adatok, helyi értesítések, szerveres adatküldés, törlés és biztonsági mentés tényleges viselkedése.
- Ellenőrizzük a release-csomag SDK-it és hálózati viselkedését. Az operációs rendszer mentési beállításairól és az értesítések zárolt képernyős megjelenéséről pontos tájékoztatás kell. Ajánlott alap: a platform szokásos mentése megengedett, de ez nem saját felhőszinkron és nem helyettesíti az exportot.
- Az összes helyi adat törlése elérhető a beállításokban, megerősítéssel; a törlés az emlékeztetőket és a helyi helyreállítási példányokat is eltávolítja.
- Az áruházi adatvédelmi és engedélynyilatkozatok a tényleges release-viselkedés alapján készülnek. A publikáló azonosítók, támogatási elérhetőség és a tájékoztató nyilvános URL-je a kiadási körben véglegesítendő.

Automatizált ellenőrzés:

- `tsc --noEmit` és ESLint hibák, valamint a jelenlegi figyelmeztetések rendezése.
- Célzott tesztek a pénzbevitelre, pontos összegekre, költési statisztikákra, sérült adatokra, migrációra és mentési hibákra.
- Értesítési döntések tesztje rögzített idővel és szimulált engedélyekkel: üres/kész lista, engedélymegtagadás, év- és időhatárok, ismételt és egymásba érő frissítések.
- Release/preview build elkészítése a választott platformokra. Az értesítések ellenőrzése telepített buildben történik, az Expo Go önmagában nem elegendő.

Készülékes ellenőrzés:

- Teljes alapfolyamat magyar, angol és német módban, kis képernyőn és nagy betűmérettel.
- Offline indulás, újraindítás utáni megőrzés, korábbi verzióról frissítés és gyors többszöri mentés.
- Helyi értesítés előtérben, háttérben és lezárt képernyőn; kikapcsolás, megtagadás és rendszerbeállításból visszavonás.
- 0%-os, részben kész és 100%-os lista; globális és személyenkénti túllépés; pénznemváltás elvetése és mentése.

Kiadási feltétel: minden fenti kritikus eset teljesül, nincs ismert csendes adatvesztés, hibás költésszámítás vagy kész lista mellett várakozó emlékeztető. Az operációs rendszer értesítési időzítési korlátait a felület nem ígéri felül.

## 7. Későbbi fejlesztési kör

1. Kézi export/import: verziózott helyi JSON-fájl megosztással, import előnézettel és teljes validációval. A visszaállítás nem írhat felül adatot jóváhagyás nélkül. CSV külön, csak olvasható exportként mérlegelhető.
2. Szezonarchívum: előző évek listáinak megőrzése és megtekintése, új szezon nyitása személyek másolásával és vásárlási állapotok nullázásával. Archivált lista nem ütemez értesítést.
3. Több ajándék egy személyhez: külön ajándék-adatmodell, személyenkénti és összesített keret, ajándékonkénti készültség. A jelenlegi egyajándékos adatok migrációja külön feladat.
4. Teljes sötét téma és további listaszűrés, ha a valós használat indokolja.

## Javasolt megvalósítási sorrend

1. Verziózott tárolás, migráció, közös állapot és mentési hibakezelés.
2. Pénzmodell, pénzbevitel és egyszeri ármentés.
3. Egységes beállításmentés, reaktív nyelv és értesítési beállításmodell.
4. Értesítési API, engedélykezelés és sorban végrehajtott ütemezés.
5. Főoldali haladás, költési kijelzés, egyszerűbb felvitel és hozzáférhetőség.
6. Célzott tesztek, telepíthető build, készülékes ellenőrzés és kiadási anyagok.

Minden lépés a saját elfogadási feltételeivel ellenőrizhető; a végső kiadási kör a teljes alkalmazás működését vizsgálja. A tervet a felhasználó jóváhagyta; az alkalmazáskód módosítása engedélyezett.
