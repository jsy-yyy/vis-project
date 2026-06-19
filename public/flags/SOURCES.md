# Flag sources

These SVG files were downloaded from Wikimedia Commons on 2026-06-19.
The application serves local copies so popup rendering does not depend on a
third-party request. Licensing and attribution details remain available on
each linked Commons description page.

| Local file | Wikimedia Commons source |
| --- | --- |
| `austria-hungary.svg` | [Flag of Austria-Hungary (1867-1918)](https://commons.wikimedia.org/wiki/File:Flag_of_Austria-Hungary_(1867%E2%80%931918).svg) |
| `china-prc.svg` | [Flag of the People's Republic of China](https://commons.wikimedia.org/wiki/File:Flag_of_the_People%27s_Republic_of_China.svg) |
| `china-qing.svg` | [Flag of China (1889-1912)](https://commons.wikimedia.org/wiki/File:Flag_of_China_(1889%E2%80%931912).svg) |
| `china-roc.svg` | [Flag of the Republic of China](https://commons.wikimedia.org/wiki/File:Flag_of_the_Republic_of_China.svg) |
| `france.svg` | [Flag of France](https://commons.wikimedia.org/wiki/File:Flag_of_France.svg) |
| `germany-empire.svg` | [Flag of Germany (1867-1918)](https://commons.wikimedia.org/wiki/File:Flag_of_Germany_(1867%E2%80%931918).svg) |
| `germany-modern.svg` | [Flag of Germany](https://commons.wikimedia.org/wiki/File:Flag_of_Germany.svg) |
| `italy-kingdom.svg` | [Flag of Italy (1861-1946)](https://commons.wikimedia.org/wiki/File:Flag_of_Italy_(1861%E2%80%931946).svg) |
| `italy.svg` | [Flag of Italy](https://commons.wikimedia.org/wiki/File:Flag_of_Italy.svg) |
| `japan.svg` | [Flag of Japan](https://commons.wikimedia.org/wiki/File:Flag_of_Japan.svg) |
| `ottoman.svg` | [Flag of the Ottoman Empire (1844-1922)](https://commons.wikimedia.org/wiki/File:Flag_of_the_Ottoman_Empire_(1844%E2%80%931922).svg) |
| `prussia.svg` | [Flag of Prussia (1892-1918, 3-2)](https://commons.wikimedia.org/wiki/File:Flag_of_Prussia_(1892-1918,_3-2).svg) |
| `russia.svg` | [Flag of Russia](https://commons.wikimedia.org/wiki/File:Flag_of_Russia.svg) |
| `turkey.svg` | [Flag of Turkey](https://commons.wikimedia.org/wiki/File:Flag_of_Turkey.svg) |
| `united-kingdom.svg` | [Flag of the United Kingdom (3-5)](https://commons.wikimedia.org/wiki/File:Flag_of_the_United_Kingdom_(3-5).svg) |
| `united-states.svg` | [Flag of the United States](https://commons.wikimedia.org/wiki/File:Flag_of_the_United_States.svg) |
| `ussr.svg` | [Flag of the Soviet Union](https://commons.wikimedia.org/wiki/File:Flag_of_the_Soviet_Union.svg) |

## Extended coverage

Modern country flags are provided by
[`flag-icons` 7.5.0](https://github.com/lipis/flag-icons), an MIT-licensed SVG
collection. The country assets used by the resolver are copied into
`public/flags/iso/` and rendered as local `<img>` resources, so popup and network
flags do not depend on CSS background-image loading.

The following small local SVGs reproduce historical flag layouts for actors
that do not have a current ISO country code:

| Local file | Reference |
| --- | --- |
| `free-france.svg` | [Flag of Free France](https://commons.wikimedia.org/wiki/Category:Flags_of_Free_France) |
| `orange-free-state.svg` | [Flags of the Orange Free State](https://commons.wikimedia.org/wiki/Category:Flags_of_the_Orange_Free_State) |
| `south-vietnam.svg` | [Flag of South Vietnam](https://commons.wikimedia.org/wiki/Category:Flags_of_South_Vietnam) |
| `transvaal.svg` | [Flags of the South African Republic](https://commons.wikimedia.org/wiki/Category:Flags_of_the_South_African_Republic) |
| `yugoslavia-kingdom.svg` | [Flags of the Kingdom of Yugoslavia](https://commons.wikimedia.org/wiki/Category:Flags_of_the_Kingdom_of_Yugoslavia) |
| `yugoslavia-socialist.svg` | [Flags of socialist Yugoslavia](https://commons.wikimedia.org/wiki/Category:Flags_of_Socialist_Federal_Republic_of_Yugoslavia) |

Actors whose historical identity is ambiguous in the dataset, including
`Tibet`, `Somaliland`, and post-1945 generic `Korea`, intentionally retain the
text fallback rather than being assigned a potentially misleading flag.
