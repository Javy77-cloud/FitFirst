# Life sheet drop folder

Drop extracted tabs from Javy’s live Google Sheet here. Parsers already read:

| File | Feeds |
| --- | --- |
| `contacts.csv` | overlays `data/appetite/fitfirst-life-contacts.csv` |
| `carrier-rep-contacts.tsv` | source extract — flatten named reps into `../fitfirst-life-contacts.csv` |
| `matrix.csv` | reserved — flatten into `../fitfirst-life-uw-matrix.csv` |
| `matrix-col-a-labels.txt` | MATRIX column A vocabulary (diff against `src/lib/life/conditions.ts`) |
| `americo-build.tsv` / `build*.csv` / `*-build.tsv` | flatten into `../fitfirst-life-build.csv`; runtime also loads dropped charts for carriers not already packed |

Sheet: https://docs.google.com/spreadsheets/d/1vd7cjSb3wB6FlH--YrLfzVur3XOclbYSAp8hP_rhuNs/edit

Americo height/weight (4'8"–5'2" sample) is seeded. Remaining build-chart tabs (AMAM, Corebridge, Foresters, F&G, LGA/Banner, NLG, Royal Neighbors, SBLI, Trans Am, UHL) stay Unknown until those tables land. Same TSV shape: `Source`, `Height`, then one column per product/rider band (`80-188`).
