# Első indítási beállítás

A `feat/onboarding` branch két rövid, átugorható képernyőt ad az új telepítésekhez.

1. **Nyelv:** magyar, angol és német. A bevezető szövege azonnal követi a választást.
2. **Pénznem és keretek:** HUF, EUR vagy USD; opcionális teljes költési keret; az új személyek alapkerete. A teljes keret külön kapcsolóval korlátlanul hagyható. Forint választásakor az érintetlen alapkeret javasolt értéke 5 000 Ft, EUR/USD esetén 50. A már szerkesztett összeg megmarad.

A Mentés és kezdés együtt menti a választásokat. A Most kihagyom mindkét lépésből elérhető, hibás vagy üres pénzbevitel esetén is működik, és az eredeti alapbeállításokat tartja meg. Minden választás később módosítható a Beállításokban.

A bevezető lezárását helyi `onboardingCompleted` jelző tárolja. Újraindításkor sem a kitöltött, sem a kihagyott bevezető nem jelenik meg újra. A befejezés előtti kilépés után újra megjelenik. Sikertelen mentéskor a bevezető nyitva marad, a bevitt értékek megmaradnak, és a mentés újrapróbálható.

## Meglévő felhasználók

A 0.3.0-s v2 adatok és a régi külön személy-/beállításkulcsok migrációja már befejezettként kezeli a bevezetőt. Frissítéskor ezért az alkalmazás közvetlenül a meglévő adatokkal indul, és nem írja át a pénznemet, nyelvet, kereteket vagy vásárlási jelöléseket. A korábbi helyreállítási példányok ugyanezt a szabályt követik. Az összes helyi adat kifejezett törlése után új telepítésnek megfelelően ismét megjelenik a bevezető.

A tárolási verzió továbbra is 2: a régi rekordok olvasásakor a hiányzó jelző igaz értéket kap. Kifejezetten hibás típusú jelzőt nem fogadunk el. Új mentésnél a jelző kötelező logikai érték.

## Ellenőrzések

Az automatizált ellenőrzések sikeresek: 19 domain teszt, TypeScript és ESLint, a kibővített böngészős folyamat, valamint a webes és Android JS/Hermes export. A két képernyő magyar nyelvű mobilméretű előnézetét vizuálisan is ellenőriztük. Telepíthető APK és valódi készülékes teszt ebben a munkamenetben nem készült.

- Domain tesztek: új telepítés, félbehagyott beállítás újraindítása, együttes mentés, kihagyás, sikertelen mentés és újrapróbálás, korábbi rekordok/helyreállítási példányok, valamint teljes törlés utáni új bevezető.
- Böngészős folyamat: élő nyelvváltás, pénznemválasztás, hibás és vesszős összeg, visszalépés a bevitel megőrzésével, alapkeret továbbadása az új személynek, mindkét lépésből történő kihagyás, újratöltés és meglévő telepítés frissítése. A nézetek 390×844 és 320×640 méretűek.
- Androidon még szükséges: első indítás, mentés/kihagyás utáni újraindítás, rendszer-vissza gomb, billentyűzet melletti görgetés, nagy betűméret és TalkBack ellenőrzése telepített buildben.

A bevezető nem kér értesítési engedélyt, nem kapcsolja be az emlékeztetőket, és nem változtatja meg a szerver nélküli működést.
