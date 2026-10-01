// Environnement de test : mode mock, matchMedia et géolocalisation absents de jsdom.
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
window.scrollTo = () => {};
Element.prototype.scrollBy = Element.prototype.scrollBy || (() => {});
