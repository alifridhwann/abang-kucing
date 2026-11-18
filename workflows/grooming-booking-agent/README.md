# Ejen WhatsApp – Tempahan Grooming

Pembantu AI (Claude) untuk WhatsApp Abang Kucing. Ia menjawab soalan grooming dalam Bahasa Melayu, mengumpul butiran tempahan, memberi anggaran harga, dan menyerahkan ringkasan kepada staf untuk sahkan slot.

## Aliran

1. **Mesej masuk**: pelanggan WhatsApp nombor yang dipasang trigger.
2. **Pembantu tempahan grooming** (agent, `claude-opus-5-5`): jawab soalan, kumpul butiran, hantar ringkasan, simpan `booking_summary`.
3. **Staf sahkan tempahan** (handoff): workflow berhenti, staf balas dari inbox Kapso.

AI terus serahkan kepada staf untuk kucing sakit, aduan, diskaun, slot hari yang sama, tempahan sedia ada, hotel dan cat sitting.

## Fail

| Fail | Kegunaan |
| --- | --- |
| `system-prompt.md` | Arahan AI. Sumber utama; edit di sini. |
| `build.mjs` | Jana `workflow.json` dan `definition.json` daripada `system-prompt.md` |
| `workflow.json` | Tetapan penuh: nama, status `draft`, debounce 5 saat, trigger Sandbox (tidak aktif) |
| `definition.json` | Graf nod untuk Kapso |

Selepas edit `system-prompt.md`, jana semula:

```bash
node workflows/grooming-booking-agent/build.mjs
```

## Pasang ke Kapso

Perlu akses tulis: Kapso connector dengan `mcp:workflows:read` + `mcp:workflows:write`, atau Kapso CLI / API key.

1. Cipta workflow daripada `workflow.json` (status `draft`).
2. Tambah trigger `inbound_message` pada nombor **Sandbox** (`597907523413541`).
3. Uji di Sandbox (senarai di bawah).
4. Bila lulus, tukar trigger ke nombor sebenar `402007446322268` (+60 13-223 7553) dan publish.

## Senarai ujian (Sandbox)

- [ ] "Salam, berapa harga grooming?" → harga + soalan butiran
- [ ] Tempahan penuh 1 kucing adult long hair, hantar sendiri → ringkasan RM45, workflow ke handoff
- [ ] Pickup dengan location pin → kadar RM10/RM15, staf sahkan jarak
- [ ] "Kucing ada kutu, perlu lion cut?" → tak semestinya, mandian kutu + ubat kutu
- [ ] "Nak hantar hari ni" → serah kepada staf
- [ ] "Kucing saya muntah" → serah kepada staf (dan ke vet jika kecemasan)
- [ ] "Boleh bagi diskaun?" → serah kepada staf, tiada diskaun
- [ ] Pelanggan tulis dalam English → balas dalam BM
- [ ] Tanya Cat Hotel → fakta hotel, kemudian serah kepada staf

## Sebelum lancar

- Tambah kredit AI (baki terakhir US$2.00). Pelan Free: 2,000 mesej sebulan termasuk balasan AI.
- Balasan dari WhatsApp Business App (telefon) **tidak** hentikan bot secara automatik. Staf perlu tekan **Handoff** dalam inbox Kapso sebelum balas.
