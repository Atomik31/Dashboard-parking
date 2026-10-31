/* Le plugin leaflet-gesture-handling attend un `L` global : à importer AVANT le plugin. */
import L from 'leaflet';

window.L = window.L || L;
