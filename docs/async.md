# Asynchrone code

In informatica hebben we een paar manieren gezien om de volgorde waarin code wordt uitgevoerd te veranderen: 

- Met lussen kunnen dingen herhaald worden
- Functies worden gebruikt om heen en weer te springen

Maar ja, dat is een beetje saai, nietwaar? Laten we het *to the next level* nemen: code tegelijk uitvoeren! 

## Het idee
De reden waarom we asynchrone ("a" *niet* - "synchroon" *samenvallend met de tijd*) code willen is omdat we, voor websites in't specifiek, niet willen dat de interface blokkeert terwijl we iets downloaden. Google Docs is hier een mooi voorbeeld van: telkens je iets intypt wordt het doorgestuurd naar Google's servers om op te slaan, maar als je bij elke letter die je typt zou moeten wachten tot het geüploaded is, zou het een beetje onnozel zijn. 

## Programmeerstructuur
Als je een AJAX-verzoek (*Asynchronous JavaScript And XML*) start, geeft de `return`-t de functie meteen, en wordt een zogeheten *callback*-functie uitgevoerd als'ie klaar is. 

We gaan dus als parameter in een functie een andere functie steken. 

> Functie-ception!

```javascript
var telStations = function(stations) {
    aantalEenhoorns = stations.length;
}

// Ergens anders in de code
var aantalStations = 0;
downloadStations(telStations);
```

`downloadStations()` gaat een AJAX-aanvraag doen (dus een website laten), maar doet direct alsof hij klaar is. Als je nu kijkt naar het aantal stations: 

```javascript
console.log('Aantal stations: ', aantalStations); // 0
```

Ook al zijn er meer dan nul. Op het moment dat de pagina is gedownloaded, wordt de *callback*-functie `telStations()` uitgevoerd, en krijgt hij als parameter de stations die gedownload zijn. Dus pas op dat moment wordt `aantalStations` veranderd. 

### Anonieme functies als callback
Iets wat vrij veel wordt gebruikt als callback, is een *anonieme functie*. Dit is niets meer dan een functie zonder naam. Voorbeeldje: 

```javascript
downloadStations(function (stations) {
    console.log('Stations gedownloaded: ', stations);
});
```

Op het moment dat de data is gedownloaded, wordt die anonieme functie uitgevoerd en krijg je een log met de gevonden stations. 
