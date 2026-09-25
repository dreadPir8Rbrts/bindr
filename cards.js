// Edit inventory here. Keep each id unique and stable.
const CARDS = [
  {
    id: "c1", thumb: "images/grid/c1.jpg", number: "001/065", name: "Snorlax (Reverse Holo)", set: "Legendary Collection · 64/110 · Uncommon",
    price: 1800, condition: "Near Mint", rare:true, sold:true,
    description: "Snorlax from the 2002 Legendary Collection set, reverse holo finish — the foil runs across the card back and border instead of the artwork window, a subtle vintage look collectors specifically hunt for. Ken Sugimori illustration, 90 HP, Thick Skinned power. In great condition throughout.",
    photos: [
      "images/full/c1_1.jpg"
    ]
  },
  {
    id: "c2", thumb: "images/grid/c2.jpg", number: "002/065", name: "Alakazam (Reverse Holo)", set: "Legendary Collection · 1/110 · Rare Holo",
    price: 800, condition: "Near Mint", rare:true, sold:true,
    description: "Alakazam's Damage Swap power makes it one of the trickiest support Pokemon from the original era, and the reverse holo foil across the border gives this print its glassy, all-over shine instead of just the artwork window. Ken Sugimori illustration. In great condition throughout.",
    photos: [
      "images/full/c2_1.jpg"
    ]
  },
  {
    id: "c3", thumb: "images/grid/c3.jpg", number: "003/065", name: "Moltres (Reverse Holo)", set: "Legendary Collection · 30/110 · Rare",
    price: 575, condition: "Lightly Played+", rare:false, sold:true,
    description: "The legendary fire bird reprinted with the Legendary Collection's signature reverse holo fireworks pattern. Great eye appeal for the price point. Priced to reflect the Lightly Played+ grade — see photos for exact condition.",
    photos: [
      "images/full/c3_1.jpg"
    ]
  },
  {
    id: "c4", thumb: "images/grid/c4.jpg", number: "004/065", name: "Magneton (Reverse Holo)", set: "Legendary Collection · 28/110 · Rare",
    price: 275, condition: "Near Mint", rare:false, sold:true,
    description: "A clean, affordable entry point into the Legendary Collection reverse holo run. In great condition throughout.",
    photos: [
      "images/full/c4_1.jpg"
    ]
  },
  {
    id: "c5", thumb: "images/grid/c5.jpg", number: "005/065", name: "Dark Vaporeon (Reverse Holo)", set: "Legendary Collection · 9/110 · Rare Holo",
    price: 675, condition: "Near Mint", rare:true, sold:true,
    description: "One of the eeveelution chase cards from this set, reprinted from the Team Rocket era with the reverse holo treatment applied across the whole card. Strong contrast between the dark artwork and the shimmering border. In great condition throughout.",
    photos: [
      "images/full/c5_1.jpg"
    ]
  },
  {
    id: "c6", thumb: "images/grid/c6.jpg", number: "006/065", name: "Flareon (Reverse Holo)", set: "Legendary Collection · 10/110 · Rare Holo",
    price: 675, condition: "Near Mint", rare:true, sold:true,
    description: "Flareon in the Legendary Collection reverse holo finish, one of the more requested eeveelutions from this set. Great condition, strong centering.",
    photos: [
      "images/full/c6_1.jpg"
    ]
  },
  {
    id: "c7", thumb: "images/grid/c7.jpg", number: "007/065", name: "Jolteon (Reverse Holo)", set: "Legendary Collection · 14/110 · Rare Holo",
    price: 275, condition: "Moderately Played", rare:false, sold:true,
    description: "Jolteon reprinted with the reverse holo fireworks pattern. Priced to reflect a visible crease on the front, top left corner — see photos for the exact spot. Rest of the card presents well with strong foil shine.",
    photos: [
      "images/full/c7_1.jpg"
    ]
  },
  {
    id: "c8", thumb: "images/grid/c8.jpg", number: "008/065", name: "Dark Gyarados (Reverse Holo)", set: "EX Team Rocket Returns · 36/109 · Uncommon",
    price: 750, condition: "Near Mint-", rare:false,
    description: "Dark Gyarados from the 2004 EX Team Rocket Returns set, one of the fan-favorite Dark Pokemon reprints with the Dark Scale body and a hard-hitting Dark Streak attack. Reverse holo foil across the border. In great condition.",
    photos: [
      "images/full/c8_1.jpg",
      "images/full/c8_2.jpg",
      "images/full/c8_3.jpg"
    ]
  },
  {
    id: "c9", thumb: "images/grid/c9.jpg", number: "009/065", name: "Dark Electrode (Reverse Holo)", set: "EX Team Rocket Returns · 4/109 · Rare Holo",
    price: 165, condition: "Near Mint", rare:true, sold:true,
    description: "Dark Electrode's Darkness Navigation power makes it a reliable energy-fetcher, printed here in the Team Rocket Returns reverse holo finish. In great condition.",
    photos: [
      "images/full/c9_1.jpg",
      "images/full/c9_2.jpg",
      "images/full/c9_3.jpg"
    ]
  },
  {
    id: "c10", thumb: "images/grid/c10.jpg", number: "010/065", name: "Dark Slowking (Reverse Holo)", set: "EX Team Rocket Returns · 9/109 · Rare Holo",
    price: 165, condition: "Lightly Played+", rare:true, sold:true,
    description: "Dark Slowking, with its Cunning power for deck peeking and a scaling Litter attack, in the Team Rocket Returns reverse holo finish. Priced to reflect the Lightly Played+ grade — see photos for exact condition.",
    photos: [
      "images/full/c10_1.jpg"
    ]
  },
  {
    id: "c11", thumb: "images/grid/c11.jpg", number: "011/065", name: "Dark Sandslash (Reverse Holo)", set: "EX Team Rocket Returns · 18/109 · Rare",
    price: 225, condition: "Near Mint", rare:false, sold:true,
    description: "Dark Sandslash, whose Poison Payback body punishes anything that hits it, in the Team Rocket Returns reverse holo finish. In great condition.",
    photos: [
      "images/full/c11_1.jpg",
      "images/full/c11_2.jpg",
      "images/full/c11_3.jpg"
    ]
  },
  {
    id: "c12", thumb: "images/grid/c12.jpg", number: "012/065", name: "Dratini (Reverse Holo)", set: "EX Team Rocket Returns · 53/109 · Common",
    price: 85, condition: "Lightly Played", rare:false, sold:true,
    description: "Dratini in the Team Rocket Returns reverse holo finish. Priced to reflect a swirl mark on the head in the artwork — see photos for the exact spot.",
    photos: [
      "images/full/c12_1.jpg"
    ]
  },
  {
    id: "c13", thumb: "images/grid/c13.jpg", number: "013/065", name: "Magikarp (Reverse Holo) — Copy #1", set: "EX Team Rocket Returns · 65/109 · Common",
    price: 375, condition: "Near Mint", rare:false, sold:true,
    description: "Magikarp in the Team Rocket Returns reverse holo finish, one of two copies available. This copy has a distinct swirl pattern in the foil — see photos. In great condition.",
    photos: [
      "images/full/c13_1.jpg"
    ]
  },
  {
    id: "c14", thumb: "images/grid/c14.jpg", number: "014/065", name: "Magikarp (Reverse Holo) — Copy #2", set: "EX Team Rocket Returns · 65/109 · Common",
    price: 375, condition: "Near Mint", rare:false, sold:true,
    description: "Magikarp in the Team Rocket Returns reverse holo finish, the second of two copies available. In great condition.",
    photos: [
      "images/full/c14_1.jpg"
    ]
  },
  {
    id: "c15", thumb: "images/grid/c15.jpg", number: "015/065", name: "Mew (Reverse Holo)", set: "EX Legend Maker · 10/92 · Rare Holo",
    price: 900, condition: "Near Mint+", rare:true, sold:true,
    description: "Mew from the 2006 EX Legend Maker set, reverse holo finish. In great condition.",
    photos: [
      "images/full/c15_1.jpg"
    ]
  },
  {
    id: "c16", thumb: "images/grid/c16.jpg", number: "016/065", name: "Gengar (Reverse Holo) — Copy #1", set: "EX Legend Maker · 5/92 · Rare Holo",
    price: 1650, condition: "Near Mint+", rare:true, sold:true,
    description: "Gengar's Shadow Curse power makes it a menace even after it's knocked out, printed here in the Legend Maker reverse holo finish. First of two copies available. In great condition.",
    photos: [
      "images/full/c16_1.jpg"
    ]
  },
  {
    id: "c17", thumb: "images/grid/c17.jpg", number: "017/065", name: "Gengar (Reverse Holo) — Copy #2", set: "EX Legend Maker · 5/92 · Rare Holo",
    price: 1000, condition: "Near Mint-", rare:true,
    description: "Gengar in the Legend Maker reverse holo finish, the second of two copies available.",
    photos: [
      "images/full/c17_1.jpg",
      "images/full/c17_2.jpg",
      "images/full/c17_3.jpg"
    ]
  },
  {
    id: "c18", thumb: "images/grid/c18.jpg", number: "018/065", name: "Gengar (Reverse Holo, Swirl)", set: "EX Legend Maker · 5/92 · Rare Holo",
    price: 290, condition: "Near Mint", rare:false,
    description: "Gengar in the Legend Maker reverse holo finish with the swirl foil pattern variant — see photos for the exact look. In great condition.",
    photos: [
      "images/full/c18_1.jpg",
      "images/full/c18_2.jpg",
      "images/full/c18_3.jpg"
    ]
  },
  {
    id: "c19", thumb: "images/grid/c19.jpg", number: "019/065", name: "Misdreavus (Reverse Holo, Swirl) — Copy #1", set: "EX Legend Maker · 40/92 · Rare",
    price: 125, condition: "Near Mint+", rare:false, sold:true,
    description: "Misdreavus in the Legend Maker reverse holo finish with the swirl foil pattern variant. First of two copies available. In great condition.",
    photos: [
      "images/full/c19_1.jpg",
      "images/full/c19_2.jpg",
      "images/full/c19_3.jpg"
    ]
  },
  {
    id: "c20", thumb: "images/grid/c20.jpg", number: "020/065", name: "Misdreavus (Reverse Holo, Swirl) — Copy #2", set: "EX Legend Maker · 40/92 · Rare",
    price: 60, condition: "Lightly Played", rare:false,
    description: "Misdreavus in the Legend Maker reverse holo finish with the swirl foil pattern variant, the second of two copies available. Priced to reflect the Lightly Played grade — see photos for exact condition.",
    photos: [
      "images/full/c20_1.jpg",
      "images/full/c20_2.jpg",
      "images/full/c20_3.jpg"
    ]
  },
  {
    id: "c21", thumb: "images/grid/c21.jpg", number: "021/065", name: "Golem (Reverse Holo)", set: "EX Legend Maker · 6/92 · Rare Holo",
    price: 125, condition: "Near Mint", rare:false,
    description: "Golem in the Legend Maker reverse holo finish. In great condition.",
    photos: [
      "images/full/c21_1.jpg",
      "images/full/c21_2.jpg",
      "images/full/c21_3.jpg"
    ]
  },
  {
    id: "c22", thumb: "images/grid/c22.jpg", number: "022/065", name: "Growlithe (Reverse Holo)", set: "EX Legend Maker · 55/92 · Rare",
    price: 225, condition: "Near Mint", rare:false, sold:true,
    description: "Growlithe in the Legend Maker reverse holo finish. In great condition.",
    photos: [
      "images/full/c22_1.jpg",
      "images/full/c22_2.jpg",
      "images/full/c22_3.jpg"
    ]
  },
  {
    id: "c23", thumb: "images/grid/c23.jpg", number: "023/065", name: "Deoxys (Reverse Holo) — Copy #1", set: "EX Emerald · 2/106 · Rare Holo",
    price: 800, condition: "Near Mint", rare:true, sold:true,
    description: "Deoxys in the EX Emerald reverse holo finish, featuring the set's signature foil Poke Ball and star pattern. In great condition.",
    photos: [
      "images/full/c23_1.jpg",
      "images/full/c23_2.jpg",
      "images/full/c23_3.jpg"
    ]
  },
  {
    id: "c24", thumb: "images/grid/c24.jpg", number: "024/065", name: "Kyogre (Reverse Holo)", set: "EX Emerald · 6/106 · Rare Holo",
    price: 540, condition: "Near Mint", rare:true, sold:true,
    description: "Kyogre in the EX Emerald reverse holo finish. In great condition.",
    photos: [
      "images/full/c24_1.jpg",
      "images/full/c24_2.jpg",
      "images/full/c24_3.jpg"
    ]
  },
  {
    id: "c25", thumb: "images/grid/c25.jpg", number: "025/065", name: "Milotic (Reverse Holo) — Copy #1", set: "EX Emerald · 8/106 · Rare Holo",
    price: 400, condition: "Near Mint+", rare:false, sold:true,
    description: "Milotic in the EX Emerald reverse holo finish. First of two copies available. In great condition.",
    photos: [
      "images/full/c25_1.jpg"
    ]
  },
  {
    id: "c26", thumb: "images/grid/c26.jpg", number: "026/065", name: "Milotic (Reverse Holo) — Copy #2", set: "EX Emerald · 8/106 · Rare Holo",
    price: 300, condition: "Near Mint", rare:false, sold:true,
    description: "Milotic in the EX Emerald reverse holo finish, the second of two copies available. In great condition.",
    photos: [
      "images/full/c26_1.jpg",
      "images/full/c26_2.jpg",
      "images/full/c26_3.jpg"
    ]
  },
  {
    id: "c27", thumb: "images/grid/c27.jpg", number: "027/065", name: "Milotic (Reverse Holo) — Copy #3", set: "EX Emerald · 8/106 · Rare Holo",
    price: 300, condition: "Near Mint-", rare:false,
    description: "Milotic in the EX Emerald reverse holo finish, the third of three copies available.",
    photos: [
      "images/full/c27_1.jpg",
      "images/full/c27_2.jpg",
      "images/full/c27_3.jpg"
    ]
  },
  {
    id: "c28", thumb: "images/grid/c28.jpg", number: "028/065", name: "Swampert (Reverse Holo)", set: "EX Emerald · 11/106 · Rare Holo",
    price: 375, condition: "Near Mint", rare:true,
    description: "Swampert in the EX Emerald reverse holo finish. In great condition.",
    photos: [
      "images/full/c28_1.jpg",
      "images/full/c28_2.jpg",
      "images/full/c28_3.jpg"
    ]
  },
  {
    id: "c29", thumb: "images/grid/c29.jpg", number: "029/065", name: "Sceptile (Reverse Holo)", set: "EX Emerald · 10/106 · Rare Holo",
    price: 325, condition: "Near Mint", rare:true, sold:true,
    description: "Sceptile's Green Essence body protects your active field from special conditions, printed here in the EX Emerald reverse holo finish. In great condition.",
    photos: [
      "images/full/c29_1.jpg"
    ]
  },
  {
    id: "c30", thumb: "images/grid/c30.jpg", number: "030/065", name: "Rhydon (Reverse Holo)", set: "EX Emerald · 19/106 · Rare",
    price: 100, condition: "Near Mint", rare:false, sold:true,
    description: "Rhydon in the EX Emerald reverse holo finish. In great condition.",
    photos: [
      "images/full/c30_1.jpg",
      "images/full/c30_2.jpg",
      "images/full/c30_3.jpg"
    ]
  },
  {
    id: "c31", thumb: "images/grid/c31.jpg", number: "031/065", name: "Plusle (Reverse Holo)", set: "EX Emerald · 39/106 · Uncommon",
    price: 235, condition: "Near Mint-", rare:false, sold:true,
    description: "Plusle in the EX Emerald reverse holo finish.",
    photos: [
      "images/full/c31_1.jpg"
    ]
  },
  {
    id: "c32", thumb: "images/grid/c32.jpg", number: "032/065", name: "Minun (Reverse Holo)", set: "EX Emerald · 37/106 · Uncommon",
    price: 250, condition: "Near Mint", rare:false, sold:true,
    description: "Minun in the EX Emerald reverse holo finish. In great condition.",
    photos: [
      "images/full/c32_1.jpg"
    ]
  },
  {
    id: "c33", thumb: "images/grid/c33.jpg", number: "033/065", name: "Electrike (Reverse Holo)", set: "EX Emerald · 47/106 · Common",
    price: 50, condition: "Near Mint", rare:false,
    description: "Electrike in the EX Emerald reverse holo finish. In great condition.",
    photos: [
      "images/full/c33_1.jpg",
      "images/full/c33_2.jpg",
      "images/full/c33_3.jpg"
    ]
  },
  {
    id: "c34", thumb: "images/grid/c34.jpg", number: "034/065", name: "Combusken (Reverse Holo)", set: "EX Emerald · 25/106 · Uncommon",
    price: 90, condition: "Near Mint-", rare:false, sold:true,
    description: "Combusken in the EX Emerald reverse holo finish.",
    photos: [
      "images/full/c34_1.jpg"
    ]
  },
  {
    id: "c35", thumb: "images/grid/c35.jpg", number: "035/065", name: "Mewtwo δ (Reverse Holo)", set: "EX Delta Species · 12/113 · Rare Holo",
    price: 790, condition: "Lightly Played", rare:true, sold:true,
    description: "Mewtwo's Delta Switch ability and Fire/Metal typing make it a standout Delta Species print, in the reverse holo finish. Priced to reflect the Lightly Played grade — see photos for exact condition.",
    photos: [
      "images/full/c35_1.jpg"
    ]
  },
  {
    id: "c36", thumb: "images/grid/c36.jpg", number: "036/065", name: "Ditto (Squirtle) — Copy #1", set: "EX Delta Species · 64/113 · Uncommon",
    price: 525, condition: "Near Mint", rare:true, sold:true,
    description: "Ditto's Duplicate power lets it swap itself for another Ditto mid-game, printed here as the Squirtle-flavored Delta Species reverse holo. First of multiple copies available. In great condition.",
    photos: [
      "images/full/c36_1.jpg"
    ]
  },
  {
    id: "c37", thumb: "images/grid/c37.jpg", number: "037/065", name: "Ditto (Squirtle) — Copy #2", set: "EX Delta Species · 64/113 · Uncommon",
    price: 525, condition: "Near Mint", rare:true, sold:true,
    description: "Second copy of Ditto's Squirtle-flavored Delta Species reverse holo print, in Near Mint condition.",
    photos: [
      "images/full/c37_1.jpg"
    ]
  },
  {
    id: "c38", thumb: "images/grid/c38.jpg", number: "038/065", name: "Ditto (Charmander)", set: "EX Delta Species · 61/113 · Uncommon",
    price: 500, condition: "Near Mint-", rare:true, sold:true,
    description: "Ditto's Charmander-flavored Delta Species print, reverse holo finish. Priced to reflect the Near Mint- grade — see photos for details.",
    photos: [
      "images/full/c38_1.jpg"
    ]
  },
  {
    id: "c39", thumb: "images/grid/c39.jpg", number: "039/065", name: "Ditto (Charmander)", set: "EX Delta Species · 37/113 · Uncommon",
    price: 575, condition: "Near Mint", rare:true, sold:true,
    description: "A different Charmander-flavored Ditto print from EX Delta Species, reverse holo finish, in Near Mint condition.",
    photos: [
      "images/full/c39_1.jpg"
    ]
  },
  {
    id: "c40", thumb: "images/grid/c40.jpg", number: "040/065", name: "Gyarados (Reverse Holo)", set: "EX Deoxys · 5/107 · Rare Holo",
    price: 500, condition: "Lightly Played+", rare:true,
    description: "Gyarados in the EX Deoxys reverse holo finish. Priced to reflect the Lightly Played+ grade — see photos for details.",
    photos: [
      "images/full/c40_1.jpg",
      "images/full/c40_2.jpg",
      "images/full/c40_3.jpg"
    ]
  },
  {
    id: "c41", thumb: "images/grid/c41.jpg", number: "041/065", name: "Gyarados (Reverse Holo)", set: "EX Deoxys · 5/107 · Rare Holo",
    price: 225, condition: "Lightly Played-", rare:true, sold:true,
    description: "A second copy of the EX Deoxys Gyarados reverse holo. Priced to reflect the Lightly Played- grade — see photos for details.",
    photos: [
      "images/full/c41_1.jpg"
    ]
  },
  {
    id: "c42", thumb: "images/grid/c42.jpg", number: "042/065", name: "Gyarados", set: "EX Deoxys · 5/107 · Rare Holo",
    price: 115, condition: "Lightly Played+", rare:true,
    description: "Gyarados in the standard Holo finish from EX Deoxys. Priced to reflect the Lightly Played+ grade — see photos for details.",
    photos: [
      "images/full/c42_1.jpg",
      "images/full/c42_2.jpg",
      "images/full/c42_3.jpg"
    ]
  },
  {
    id: "c43", thumb: "images/grid/c43.jpg", number: "043/065", name: "Magikarp (Reverse Holo) — Copy #1", set: "EX Deoxys · 65/107 · Common",
    price: 375, condition: "Near Mint+", rare:false, sold:true,
    description: "Magikarp in the EX Deoxys reverse holo finish. Priced to reflect the Near Mint+ grade — see photos for details.",
    photos: [
      "images/full/c43_1.jpg"
    ]
  },
  {
    id: "c44", thumb: "images/grid/c44.jpg", number: "044/065", name: "Magikarp (Reverse Holo) — Copy #2", set: "EX Deoxys · 65/107 · Common",
    price: 335, condition: "Near Mint", rare:false,
    description: "A second copy of the EX Deoxys Magikarp reverse holo, in Near Mint condition.",
    photos: [
      "images/full/c44_1.jpg",
      "images/full/c44_2.jpg",
      "images/full/c44_3.jpg"
    ]
  },
  {
    id: "c45", thumb: "images/grid/c45.jpg", number: "045/065", name: "Jirachi (Reverse Holo)", set: "EX Deoxys · 90/107 · Rare",
    price: 525, condition: "Near Mint-", rare:true,
    description: "Jirachi in the EX Deoxys reverse holo finish. Priced to reflect the Near Mint- grade — see photos for details.",
    photos: [
      "images/full/c45_1.jpg",
      "images/full/c45_2.jpg",
      "images/full/c45_3.jpg"
    ]
  },
  {
    id: "c46", thumb: "images/grid/c46.jpg", number: "046/065", name: "Altaria (Reverse Holo)", set: "EX Deoxys · 7/107 · Rare",
    price: 135, condition: "Near Mint-", rare:true,
    description: "Altaria in the EX Deoxys reverse holo finish. Priced to reflect the Near Mint- grade — see photos for details.",
    photos: [
      "images/full/c46_1.jpg",
      "images/full/c46_2.jpg",
      "images/full/c46_3.jpg"
    ]
  },
  {
    id: "c47", thumb: "images/grid/c47.jpg", number: "047/065", name: "Deoxys (Reverse Holo)", set: "EX Deoxys · 3/107 · Rare Holo",
    price: 320, condition: "Near Mint-", rare:true,
    description: "Deoxys in the EX Deoxys reverse holo finish. Priced to reflect the Near Mint- grade — see photos for details.",
    photos: [
      "images/full/c47_1.jpg",
      "images/full/c47_2.jpg",
      "images/full/c47_3.jpg"
    ]
  },
  {
    id: "c48", thumb: "images/grid/c48.jpg", number: "048/065", name: "Metagross (Reverse Holo) — Copy #1", set: "EX Deoxys · 12/107 · Rare",
    price: 200, condition: "Lightly Played+", rare:true,
    description: "Metagross in the EX Deoxys reverse holo finish. Priced to reflect the Lightly Played+ grade — see photos for details.",
    photos: [
      "images/full/c48_1.jpg",
      "images/full/c48_2.jpg",
      "images/full/c48_3.jpg"
    ]
  },
  {
    id: "c49", thumb: "images/grid/c49.jpg", number: "049/065", name: "Metagross (Reverse Holo) — Copy #2", set: "EX Deoxys · 12/107 · Rare",
    price: 165, condition: "Lightly Played", rare:true,
    description: "A second copy of the EX Deoxys Metagross reverse holo. Priced to reflect the Lightly Played grade — see photos for details.",
    photos: [
      "images/full/c49_1.jpg",
      "images/full/c49_2.jpg",
      "images/full/c49_3.jpg"
    ]
  },
  {
    id: "c50", thumb: "images/grid/c50.jpg", number: "050/065", name: "Minun (Reverse Holo)", set: "EX Deoxys · 37/107 · Uncommon",
    price: 375, condition: "Near Mint+", rare:false, sold:true,
    description: "Minun in the EX Deoxys reverse holo finish, in Near Mint+ condition.",
    photos: [
      "images/full/c50_1.jpg",
      "images/full/c50_2.jpg",
      "images/full/c50_3.jpg"
    ]
  },
  {
    id: "c51", thumb: "images/grid/c51.jpg", number: "051/065", name: "Electrike (Reverse Holo)", set: "EX Deoxys · 47/107 · Common",
    price: 50, condition: "Near Mint", rare:false,
    description: "Electrike in the EX Deoxys reverse holo finish, in Near Mint condition.",
    photos: [
      "images/full/c51_1.jpg",
      "images/full/c51_2.jpg",
      "images/full/c51_3.jpg"
    ]
  },
  {
    id: "c52", thumb: "images/grid/c52.jpg", number: "052/065", name: "Koffing (Reverse Holo) — Copy #1", set: "EX Deoxys · 51/107 · Common",
    price: 50, condition: "Near Mint", rare:false,
    description: "Koffing in the EX Deoxys reverse holo finish, in Near Mint condition.",
    photos: [
      "images/full/c52_1.jpg",
      "images/full/c52_2.jpg",
      "images/full/c52_3.jpg"
    ]
  },
  {
    id: "c53", thumb: "images/grid/c53.jpg", number: "053/065", name: "Koffing (Reverse Holo) — Copy #2", set: "EX Deoxys · 51/107 · Common",
    price: 50, condition: "Near Mint", rare:false,
    description: "A second copy of the EX Deoxys Koffing reverse holo, in Near Mint condition.",
    photos: [
      "images/full/c53_1.jpg",
      "images/full/c53_2.jpg",
      "images/full/c53_3.jpg"
    ]
  },
  {
    id: "c54", thumb: "images/grid/c54.jpg", number: "054/065", name: "Charizard (Holo)", set: "EX Crystal Guardians · 16/100 · Rare Holo",
    price: 1250, condition: "Near Mint-", rare:true, sold:true,
    description: "Charizard in the EX Crystal Guardians holo finish. Priced to reflect the Near Mint- grade — see photos for details.",
    photos: [
      "images/full/c54_1.jpg"
    ]
  },
  {
    id: "c55", thumb: "images/grid/c55.jpg", number: "055/065", name: "Blastoise (Reverse Holo)", set: "EX Crystal Guardians · 28/100 · Rare",
    price: 425, condition: "Near Mint-", rare:true, sold:true,
    description: "Blastoise in the EX Crystal Guardians reverse holo finish. Priced to reflect the Near Mint- grade — see photos for details.",
    photos: [
      "images/full/c55_1.jpg"
    ]
  },
  {
    id: "c56", thumb: "images/grid/c56.jpg", number: "056/065", name: "Venusaur (Reverse Holo)", set: "EX Crystal Guardians · 27/100 · Rare",
    price: 165, condition: "Lightly Played+", rare:true, sold:true,
    description: "Venusaur in the EX Crystal Guardians reverse holo finish. Priced to reflect the Lightly Played+ grade — see photos for details.",
    photos: [
      "images/full/c56_1.jpg"
    ]
  },
  {
    id: "c57", thumb: "images/grid/c57.jpg", number: "057/065", name: "Sableye (Reverse Holo)", set: "EX Crystal Guardians · 52/100 · Uncommon",
    price: 285, condition: "Near Mint", rare:false, sold:true,
    description: "Sableye in the EX Crystal Guardians reverse holo finish, in Near Mint condition.",
    photos: [
      "images/full/c57_1.jpg",
      "images/full/c57_2.jpg",
      "images/full/c57_3.jpg"
    ]
  },
  {
    id: "c58", thumb: "images/grid/c58.jpg", number: "058/065", name: "Ho-oh (Reverse Holo, Reverse Pokéball Error)", set: "EX Unseen Forces · 7/115 · Rare Holo",
    price: 290, condition: "Near Mint-", rare:true, sold:true,
    description: "Ho-oh in the EX Unseen Forces reverse holo finish with a reverse Pokéball printing error. Priced to reflect the Near Mint- grade — see photos for details.",
    photos: [
      "images/full/c58_1.jpg",
      "images/full/c58_2.jpg",
      "images/full/c58_3.jpg"
    ]
  },
  {
    id: "c59", thumb: "images/grid/c59.jpg", number: "059/065", name: "Ho-oh (Holo)", set: "EX Unseen Forces · 7/115 · Rare Holo",
    price: 125, condition: "Near Mint+", rare:true,
    description: "Ho-oh in the standard EX Unseen Forces holo finish, in Near Mint+ condition.",
    photos: [
      "images/full/c59_1.jpg",
      "images/full/c59_2.jpg",
      "images/full/c59_3.jpg"
    ]
  },
  {
    id: "c60", thumb: "images/grid/c60.jpg", number: "060/065", name: "Typhlosion (Reverse Holo)", set: "EX Unseen Forces · 5/115 · Rare",
    price: 275, condition: "Near Mint", rare:true,
    description: "Typhlosion in the EX Unseen Forces reverse holo finish, in Near Mint condition.",
    photos: [
      "images/full/c60_1.jpg",
      "images/full/c60_2.jpg",
      "images/full/c60_3.jpg"
    ]
  },
  {
    id: "c61", thumb: "images/grid/c61.jpg", number: "061/065", name: "Poliwrath (Reverse Holo)", set: "EX Unseen Forces · 14/115 · Rare",
    price: 135, condition: "Near Mint-", rare:true,
    description: "Poliwrath in the EX Unseen Forces reverse holo finish. Priced to reflect the Near Mint- grade — see photos for details.",
    photos: [
      "images/full/c61_1.jpg",
      "images/full/c61_2.jpg",
      "images/full/c61_3.jpg"
    ]
  },
  {
    id: "c62", thumb: "images/grid/c62.jpg", number: "062/065", name: "Eevee (Reverse Holo)", set: "EX Unseen Forces · 40/115 · Common",
    price: 40, condition: "Moderately Played", rare:false,
    description: "Eevee in the EX Unseen Forces reverse holo finish. Priced to reflect the Moderately Played grade — see photos for details.",
    photos: [
      "images/full/c62_1.jpg",
      "images/full/c62_2.jpg",
      "images/full/c62_3.jpg"
    ]
  },
  {
    id: "c63", thumb: "images/grid/c63.jpg", number: "063/065", name: "Mareep (Reverse Holo)", set: "EX Unseen Forces · 51/115 · Common",
    price: 45, condition: "Near Mint-", rare:false, sold:true,
    description: "Mareep in the EX Unseen Forces reverse holo finish. Priced to reflect the Near Mint- grade — see photos for details.",
    photos: [
      "images/full/c63_1.jpg"
    ]
  },
  {
    id: "c64", thumb: "images/grid/c64.jpg", number: "064/065", name: "Gyarados (Reverse Holo)", set: "EX Holon Phantoms · 7/110 · Rare Holo",
    price: 945, condition: "Lightly Played+", rare:true, sold:true,
    description: "Gyarados in the EX Holon Phantoms reverse holo finish. Priced to reflect the Lightly Played+ grade — see photos for details.",
    photos: [
      "images/full/c64_1.jpg"
    ]
  },
  {
    id: "c65", thumb: "images/grid/c65.jpg", number: "065/065", name: "Psyduck (Reverse Holo)", set: "EX Holon Phantoms · 54/110 · Common",
    price: 640, condition: "Near Mint", rare:false, sold:true,
    description: "Psyduck in the EX Holon Phantoms reverse holo finish, in Near Mint condition.",
    photos: [
      "images/full/c65_1.jpg",
      "images/full/c65_2.jpg",
      "images/full/c65_3.jpg"
    ]
  }
,
  {
    id: "c66", thumb: "images/grid/c66.jpg", number: "066/071", name: "Latios (Reverse Holo)", set: "EX Holon Phantoms · 12/110 · Rare Holo",
    price: 215, condition: "Lightly Played", rare:true, sold:true,
    description: "Latios in the EX Holon Phantoms reverse holo finish, in Lightly Played condition.",
    photos: [
      "images/full/c66_1.jpg"
    ]
  },
  {
    id: "c67", thumb: "images/grid/c67.jpg", number: "067/071", name: "Latios (Reverse Holo)", set: "EX Holon Phantoms · 22/110 · Rare",
    price: 215, condition: "Lightly Played", rare:true, sold:true,
    description: "Latios in the EX Holon Phantoms reverse holo finish, in Lightly Played condition.",
    photos: [
      "images/full/c67_1.jpg"
    ]
  },
  {
    id: "c68", thumb: "images/grid/c68.jpg", number: "068/071", name: "Latias (Reverse Holo)", set: "EX Holon Phantoms · 11/110 · Rare Holo",
    price: 350, condition: "Near Mint", rare:true, sold:true,
    description: "Latias in the EX Holon Phantoms reverse holo finish, in Near Mint condition.",
    photos: [
      "images/full/c68_1.jpg",
      "images/full/c68_2.jpg",
      "images/full/c68_3.jpg"
    ]
  },
  {
    id: "c69", thumb: "images/grid/c69.jpg", number: "069/071", name: "Aerodactyl (Reverse Holo) — Copy #1", set: "EX Holon Phantoms · 35/110 · Uncommon",
    price: 275, condition: "Near Mint", rare:false,
    description: "Aerodactyl in the EX Holon Phantoms reverse holo finish, in Near Mint condition.",
    photos: [
      "images/full/c69_1.jpg",
      "images/full/c69_2.jpg",
      "images/full/c69_3.jpg"
    ]
  },
  {
    id: "c70", thumb: "images/grid/c70.jpg", number: "070/071", name: "Aerodactyl (Reverse Holo) — Copy #2", set: "EX Holon Phantoms · 35/110 · Uncommon",
    price: 315, condition: "Near Mint", rare:false, sold:true,
    description: "Aerodactyl in the EX Holon Phantoms reverse holo finish, in Near Mint condition.",
    photos: [
      "images/full/c70_1.jpg",
      "images/full/c70_2.jpg",
      "images/full/c70_3.jpg"
    ]
  },
  {
    id: "c71", thumb: "images/grid/c71.jpg", number: "071/071", name: "Deoxys (Reverse Holo)", set: "EX Holon Phantoms · Rare Holo",
    price: 275, condition: "Near Mint-", rare:true, sold:true,
    description: "Deoxys in the EX Holon Phantoms reverse holo finish, in Near Mint- condition.",
    photos: [
      "images/full/c71_1.jpg",
      "images/full/c71_2.jpg",
      "images/full/c71_3.jpg"
    ]
  }
,
  {
    id: "c72", thumb: "images/grid/c72.jpg", number: "072/074", name: "Combusken (Reverse Holo)", set: "EX Holon Phantoms · 39/110 · Uncommon",
    price: 55, condition: "Near Mint", rare:false, sold:true,
    description: "Combusken in the EX Holon Phantoms reverse holo finish, in Near Mint condition.",
    photos: [
      "images/full/c72_1.jpg"
    ]
  },
  {
    id: "c73", thumb: "images/grid/c73.jpg", number: "073/074", name: "Seviper (Reverse Holo)", set: "EX Holon Phantoms · 32/110 · Rare",
    price: 45, condition: "Near Mint-", rare:true,
    description: "Seviper in the EX Holon Phantoms reverse holo finish, in Near Mint- condition.",
    photos: [
      "images/full/c73_1.jpg",
      "images/full/c73_2.jpg",
      "images/full/c73_3.jpg"
    ]
  },
  {
    id: "c74", thumb: "images/grid/c74.jpg", number: "074/074", name: "Gardevoir (Reverse Holo)", set: "EX Power Keepers · 9/108 · Rare Holo",
    price: 115, condition: "Near Mint-", rare:true, sold:true,
    description: "Gardevoir in the EX Power Keepers reverse holo finish, in Near Mint- condition.",
    photos: [
      "images/full/c74_1.jpg"
    ]
  }
,
  {
    id: "c75", thumb: "images/grid/c75.jpg", number: "075/080", name: "Mew ex (Reverse Holo)", set: "EX Holon Phantoms · 100/110 · Ultra Rare",
    price: 1125, condition: "Near Mint+", rare:true, sold:true,
    description: "Mew ex in the EX Holon Phantoms reverse holo finish, in Near Mint+ condition.",
    photos: [
      "images/full/c75_1.jpg"
    ]
  },
  {
    id: "c76", thumb: "images/grid/c76.jpg", number: "076/080", name: "Rocket's Entei ex (Reverse Holo)", set: "EX Team Rocket Returns · 97/109 · Rare Holo",
    price: 745, condition: "Near Mint", rare:true, sold:true,
    description: "Rocket's Entei ex in the EX Team Rocket Returns reverse holo finish, in Near Mint condition.",
    photos: [
      "images/full/c76_1.jpg"
    ]
  },
  {
    id: "c77", thumb: "images/grid/c77.jpg", number: "077/080", name: "Groudon ex (Reverse Holo)", set: "EX Crystal Guardians · 93/100 · Rare Holo",
    price: 475, condition: "Near Mint", rare:true, sold:true,
    description: "Groudon ex in the EX Crystal Guardians reverse holo finish, in Near Mint condition.",
    photos: [
      "images/full/c77_1.jpg",
      "images/full/c77_2.jpg",
      "images/full/c77_3.jpg"
    ]
  },
  {
    id: "c78", thumb: "images/grid/c78.jpg", number: "078/080", name: "Kyogre ex (Triple Swirl) — Black Star Promo", set: "Black Star Promo · 001 · Holo",
    price: 440, condition: "Near Mint-", rare:true, sold:true,
    description: "Kyogre ex Black Star Promo #001 with a triple swirl holo pattern, in Near Mint- condition.",
    photos: [
      "images/full/c78_1.jpg"
    ]
  },
  {
    id: "c79", thumb: "images/grid/c79.jpg", number: "079/080", name: "Chansey ex (Triple Swirl)", set: "EX Ruby & Sapphire · 96/109 · Rare Holo",
    price: 135, condition: "Near Mint", rare:true, sold:true,
    description: "Chansey ex with a triple swirl holo pattern from EX Ruby & Sapphire, in Near Mint condition.",
    photos: [
      "images/full/c79_1.jpg"
    ]
  },
  {
    id: "c80", thumb: "images/grid/c80.jpg", number: "080/080", name: "Magnezone LV.X (Swirl)", set: "Legends Awakened · 142/146 · Rare Holo LV.X",
    price: 145, condition: "Near Mint-", rare:true,
    description: "Magnezone LV.X with a swirl holo pattern from Legends Awakened, in Near Mint- condition.",
    photos: [
      "images/full/c80_1.jpg",
      "images/full/c80_2.jpg",
      "images/full/c80_3.jpg"
    ]
  },
  {
    id: "c81", thumb: "images/grid/c81.jpg", number: "018/112", name: "Arcanine (Reverse Holo) — Copy #1", set: "EX FireRed & LeafGreen · Reverse Holo",
    price: 225, condition: "Near Mint", rare:false,
    description: "Arcanine from EX FireRed & LeafGreen with the reverse holo treatment. Clean corners and edges throughout, strong shine on the foil border. One of two copies available — see the companion listing for the second.",
    photos: [
      "images/full/c81_1.jpg",
      "images/full/c81_2.jpg",
      "images/full/c81_3.jpg"
    ]
  },
  {
    id: "c82", thumb: "images/grid/c82.jpg", number: "018/112", name: "Arcanine (Reverse Holo) — Copy #2", set: "EX FireRed & LeafGreen · Reverse Holo",
    price: 225, condition: "Near Mint", rare:false,
    description: "Second copy of the FireRed & LeafGreen reverse holo Arcanine, matching condition to the first — Near Mint with clean corners and strong foil shine.",
    photos: [
      "images/full/c82_1.jpg",
      "images/full/c82_2.jpg",
      "images/full/c82_3.jpg"
    ]
  },
  {
    id: "c83", thumb: "images/grid/c83.jpg", number: "029/112", name: "Scyther (Reverse Holo)", set: "EX FireRed & LeafGreen · Reverse Holo",
    price: 120, condition: "Near Mint", rare:false,
    description: "Scyther reverse holo from EX FireRed & LeafGreen. Near Mint, with the reverse foil pattern catching nicely across the card back and border.",
    photos: [
      "images/full/c83_1.jpg",
      "images/full/c83_2.jpg",
      "images/full/c83_3.jpg"
    ]
  },
  {
    id: "c84", thumb: "images/grid/c84.jpg", number: "006/112", name: "Nidoqueen (Reverse Holo)", set: "EX FireRed & LeafGreen · Reverse Holo",
    price: 90, condition: "Near Mint", rare:false,
    description: "Nidoqueen reverse holo from EX FireRed & LeafGreen, in Near Mint condition with clean edges and a bright foil finish.",
    photos: [
      "images/full/c84_1.jpg",
      "images/full/c84_2.jpg",
      "images/full/c84_3.jpg"
    ]
  },
  {
    id: "c85", thumb: "images/grid/c85.jpg", number: "063/112", name: "Gastly (Reverse Holo) — Copy #1", set: "EX FireRed & LeafGreen · Reverse Holo",
    price: 155, condition: "Near Mint", rare:false, sold:true,
    description: "Gastly reverse holo from EX FireRed & LeafGreen. Presents well overall — see photos for exact condition.",
    photos: [
      "images/full/c85_1.jpg"
    ]
  },
  {
    id: "c86", thumb: "images/grid/c86.jpg", number: "004/101", name: "Dark Celebi (Reverse Holo)", set: "Hidden Legends · Reverse Holo",
    price: 325, condition: "Near Mint+", rare:true, sold:true,
    description: "Dark Celebi reverse holo from Hidden Legends, graded Near Mint+ — sharp corners and a clean, bright foil finish throughout.",
    photos: [
      "images/full/c86_1.jpg"
    ]
  },
  {
    id: "c87", thumb: "images/grid/c87.jpg", number: "011/101", name: "Metagross (Reverse Holo)", set: "Hidden Legends · Reverse Holo",
    price: 115, condition: "Near Mint+", rare:true,
    description: "Metagross reverse holo from Hidden Legends, graded Near Mint+ with sharp corners and a clean, bright foil finish.",
    photos: [
      "images/full/c87_1.jpg",
      "images/full/c87_2.jpg",
      "images/full/c87_3.jpg"
    ]
  },
  {
    id: "c88", thumb: "images/grid/c88.jpg", number: "009/101", name: "Machamp (Reverse Holo) — Copy #1", set: "Hidden Legends · Reverse Holo",
    price: 100, condition: "Near Mint", rare:false,
    description: "Machamp reverse holo from Hidden Legends, Near Mint condition with clean edges and strong foil shine. One of two copies available — see the companion listing for the second.",
    photos: [
      "images/full/c88_1.jpg",
      "images/full/c88_2.jpg",
      "images/full/c88_3.jpg"
    ]
  },
  {
    id: "c89", thumb: "images/grid/c89.jpg", number: "009/101", name: "Machamp (Reverse Holo) — Copy #2", set: "Hidden Legends · Reverse Holo",
    price: 100, condition: "Near Mint", rare:false,
    description: "Second copy of the Hidden Legends reverse holo Machamp, matching condition to the first — Near Mint with clean corners and strong foil shine.",
    photos: [
      "images/full/c89_1.jpg",
      "images/full/c89_2.jpg",
      "images/full/c89_3.jpg"
    ]
  },
  {
    id: "c90", thumb: "images/grid/c90.jpg", number: "010/101", name: "Medicham (Reverse Holo)", set: "Hidden Legends · Reverse Holo",
    price: 65, condition: "Near Mint+", rare:false,
    description: "Medicham reverse holo from Hidden Legends, graded Near Mint+ with sharp corners and clean foil throughout.",
    photos: [
      "images/full/c90_1.jpg",
      "images/full/c90_2.jpg",
      "images/full/c90_3.jpg"
    ]
  },
  {
    id: "c91", thumb: "images/grid/c91.jpg", number: "002/101", name: "Claydol (Reverse Holo)", set: "Hidden Legends · Reverse Holo",
    price: 45, condition: "Near Mint-", rare:false, sold:true,
    description: "Claydol reverse holo from Hidden Legends, Near Mint- condition — priced to reflect light wear, see photos for exact details.",
    photos: [
      "images/full/c91_1.jpg"
    ]
  },
  {
    id: "c92", thumb: "images/grid/c92.jpg", number: "005/101", name: "Electrode (Reverse Holo)", set: "Hidden Legends · Reverse Holo",
    price: 50, condition: "Near Mint", rare:false,
    description: "Electrode reverse holo from Hidden Legends, Near Mint condition with clean corners and a bright, even foil finish.",
    photos: [
      "images/full/c92_1.jpg",
      "images/full/c92_2.jpg",
      "images/full/c92_3.jpg"
    ]
  },
  {
    id: "c93", thumb: "images/grid/c93.jpg", number: "014/101", name: "Shiftry (Reverse Holo)", set: "Hidden Legends · Reverse Holo",
    price: 100, condition: "Near Mint", rare:false,
    description: "Shiftry reverse holo from Hidden Legends, Near Mint condition with clean corners and a bright, even foil finish.",
    photos: [
      "images/full/c93_1.jpg",
      "images/full/c93_2.jpg",
      "images/full/c93_3.jpg"
    ]
  },
  {
    id: "c94", thumb: "images/grid/c94.jpg", number: "002/123", name: "Alakazam (Holo)", set: "Mysterious Treasures · Holo",
    price: 90, condition: "Near Mint-", rare:true, sold:true,
    description: "Alakazam holo from Mysterious Treasures, Near Mint- condition — priced to reflect light wear, see photos for exact details.",
    photos: [
      "images/full/c94_1.jpg"
    ]
  },
  {
    id: "c95", thumb: "images/grid/c95.jpg", number: "107/106", name: "Farfetch'd (Holo, Half Swirl)", set: "Emerald · Holo",
    price: 100, condition: "Near Mint+", rare:false, sold:true,
    description: "Farfetch'd holo from Emerald with the half swirl holo pattern, graded Near Mint+ with sharp corners and clean foil throughout.",
    photos: [
      "images/full/c95_1.jpg"
    ]
  },
  {
    id: "c96", thumb: "images/grid/c96.jpg", number: "009/123", name: "Garchomp (Swirl Holo)", set: "Mysterious Treasures · Holo",
    price: 85, condition: "Near Mint", rare:true,
    description: "Garchomp holo from Mysterious Treasures with the swirl foil pattern, in Near Mint condition with clean edges and a bright finish.",
    photos: [
      "images/full/c96_1.jpg",
      "images/full/c96_2.jpg",
      "images/full/c96_3.jpg"
    ]
  },
  {
    id: "c97", thumb: "images/grid/c97.jpg", number: "007/109", name: "Gardevoir (Holo)", set: "Ruby & Sapphire · Holo",
    price: 120, condition: "Near Mint-", rare:true,
    description: "Gardevoir holo from Ruby & Sapphire, Near Mint- condition — priced to reflect light wear, see photos for exact details.",
    photos: [
      "images/full/c97_1.jpg",
      "images/full/c97_2.jpg",
      "images/full/c97_3.jpg"
    ]
  },
  {
    id: "c98", thumb: "images/grid/c98.jpg", number: "011/109", name: "Sceptile (Holo)", set: "Ruby & Sapphire · Holo",
    price: 140, condition: "Near Mint-", rare:true,
    description: "Sceptile holo from Ruby & Sapphire, Near Mint- condition — priced to reflect light wear, see photos for exact details.",
    photos: [
      "images/full/c98_1.jpg",
      "images/full/c98_2.jpg",
      "images/full/c98_3.jpg"
    ]
  },
  {
    id: "c99", thumb: "images/grid/c99.jpg", number: "018/113", name: "Vaporeon (Holo)", set: "Delta Species · Holo",
    price: 30, condition: "Moderately Played", rare:true, sold:true,
    description: "Vaporeon holo from Delta Species, Moderately Played condition — priced accordingly, see photos for exact wear.",
    photos: [
      "images/full/c99_1.jpg"
    ]
  },
  {
    id: "c100", thumb: "images/grid/c100.jpg", number: "HGSS21", name: "Suicune (Swirl Holo Promo)", set: "HeartGold SoulSilver · Promo",
    price: 70, condition: "Near Mint-", rare:true, sold:true,
    description: "Suicune promo from HeartGold SoulSilver with the swirl holo pattern, Near Mint- condition — priced to reflect light wear, see photos for exact details.",
    photos: [
      "images/full/c100_1.jpg"
    ]
  },
  {
    id: "c101", thumb: "images/grid/c101.jpg", number: "002/017", name: "Deoxys (Swirl Holo)", set: "POP Series 4 · Holo",
    price: 130, condition: "Lightly Played+", rare:true, sold:true,
    description: "Deoxys holo from POP Series 4 with the swirl foil pattern, Lightly Played+ condition — see photos for exact details.",
    photos: [
      "images/full/c101_1.jpg"
    ]
  },
  {
    id: "c102", thumb: "images/grid/c102.jpg", number: "005/110", name: "Deoxys (Holo)", set: "Holon Phantoms · Holo",
    price: 225, condition: "Near Mint", rare:true,
    description: "Deoxys holo from Holon Phantoms, Near Mint condition with clean corners and a bright, even foil finish.",
    photos: [
      "images/full/c102_1.jpg",
      "images/full/c102_2.jpg",
      "images/full/c102_3.jpg"
    ]
  },
  {
    id: "c103", thumb: "images/grid/c103.jpg", number: "002/132", name: "Blastoise (Full Holo Bleed)", set: "Secret Wonders · Holo",
    price: 180, condition: "Near Mint", rare:true, sold:true,
    description: "Blastoise holo from Secret Wonders with a full holo bleed across the card face, a striking print variation collectors seek out.",
    photos: [
      "images/full/c103_1.jpg",
      "images/full/c103_2.jpg",
      "images/full/c103_3.jpg"
    ]
  },
  {
    id: "c104", thumb: "images/grid/c104.jpg", number: "015/132", name: "Mew (Holo)", set: "Secret Wonders · Holo",
    price: 265, condition: "Lightly Played+", rare:true,
    description: "Mew holo from Secret Wonders, Lightly Played+ condition — see photos for exact details.",
    photos: [
      "images/full/c104_1.jpg",
      "images/full/c104_2.jpg",
      "images/full/c104_3.jpg"
    ]
  },
  {
    id: "c105", thumb: "images/grid/c105.jpg", number: "033/144", name: "Vaporeon (Reverse Holo)", set: "Skyridge · Reverse Holo",
    price: 315, condition: "Near Mint", rare:true, sold:true,
    description: "Vaporeon reverse holo from Skyridge, Near Mint condition with clean corners and a bright, even foil finish. A tough pull from one of the most sought-after sets in the hobby.",
    photos: [
      "images/full/c105_1.jpg"
    ]
  },
  {
    id: "c106", thumb: "images/grid/c106.jpg", number: "075/147", name: "Eevee (Reverse Holo)", set: "Aquapolis · Reverse Holo",
    price: 500, condition: "Near Mint+", rare:true, sold:true,
    description: "Eevee reverse holo from Aquapolis, graded Near Mint+ with sharp corners and a clean, bright foil finish throughout.",
    photos: [
      "images/full/c106_1.jpg",
      "images/full/c106_2.jpg",
      "images/full/c106_3.jpg"
    ]
  },
  {
    id: "c107", thumb: "images/grid/c107.jpg", number: "065/097", name: "Mudkip (Reverse Holo)", set: "Dragon · Reverse Holo",
    price: 215, condition: "Near Mint", rare:false, sold:true,
    description: "Mudkip reverse holo from Dragon, Near Mint condition with clean edges and a bright, even foil finish.",
    photos: [
      "images/full/c107_1.jpg"
    ]
  },
  {
    id: "c108", thumb: "images/grid/c108.jpg", number: "098/097", name: "Charmander (Holo) — Copy #1", set: "Dragon · Holo",
    price: 380, condition: "Near Mint+", rare:true, sold:true,
    description: "Charmander holo from Dragon, graded Near Mint+ with sharp corners and clean foil throughout. One of two copies available — see the companion listing for the second.",
    photos: [
      "images/full/c108_1.jpg",
      "images/full/c108_2.jpg",
      "images/full/c108_3.jpg"
    ]
  },
  {
    id: "c109", thumb: "images/grid/c109.jpg", number: "098/097", name: "Charmander (Holo) — Copy #2", set: "Dragon · Holo",
    price: 215, condition: "Near Mint", rare:true, sold:true,
    description: "Second copy of the Dragon holo Charmander, Near Mint condition with clean corners and a bright foil finish.",
    photos: [
      "images/full/c109_1.jpg",
      "images/full/c109_2.jpg",
      "images/full/c109_3.jpg"
    ]
  },
  {
    id: "c110", thumb: "images/grid/c110.jpg", number: "007/097", name: "Minun (Holo)", set: "Dragon · Holo",
    price: 140, condition: "Near Mint-", rare:false, sold:true,
    description: "Minun holo from Dragon, Near Mint- condition — priced to reflect light wear, see photos for exact details.",
    photos: [
      "images/full/c110_1.jpg"
    ]
  },
  {
    id: "c111", thumb: "images/grid/c111.jpg", number: "010/100", name: "Sableye (Holo)", set: "Sandstorm · Holo",
    price: 140, condition: "Near Mint-", rare:true, sold:true,
    description: "Sableye holo from Sandstorm, Near Mint- condition — priced to reflect light wear, see photos for exact details.",
    photos: [
      "images/full/c111_1.jpg"
    ]
  },
  {
    id: "c112", thumb: "images/grid/c112.jpg", number: "011/165", name: "Fearow (Holo)", set: "Expedition · Holo",
    price: 115, condition: "Near Mint", rare:true, sold:true,
    description: "Fearow holo from Expedition, Near Mint condition with clean corners and a bright, even foil finish.",
    photos: [
      "images/full/c112_1.jpg",
      "images/full/c112_2.jpg",
      "images/full/c112_3.jpg"
    ]
  },
  {
    id: "c113", thumb: "images/grid/c113.jpg", number: "012", name: "Pikachu (Black Star Promo)", set: "Black Star Promo · Holo",
    price: 345, condition: "Near Mint", rare:true, sold:true,
    description: "Pikachu Black Star Promo #012, holo, Near Mint condition with clean corners and a bright, even foil finish.",
    photos: [
      "images/full/c113_1.jpg"
    ]
  },
  {
    id: "c114", thumb: "images/grid/c114.jpg", number: "004/100", name: "Dusclops (Swirl Holo)", set: "Sandstorm · Holo",
    price: 40, condition: "Lightly Played", rare:false,
    description: "Dusclops holo from Sandstorm with the swirl foil pattern, Lightly Played condition — see photos for exact details.",
    photos: [
      "images/full/c114_1.jpg",
      "images/full/c114_2.jpg",
      "images/full/c114_3.jpg"
    ]
  },
  {
    id: "c115", thumb: "images/grid/c115.jpg", number: "003/082", name: "Dark Blastoise (Swirl Holo)", set: "Team Rocket · Holo",
    price: 245, condition: "Lightly Played", rare:true,
    description: "Dark Blastoise holo from Team Rocket with the swirl foil pattern, Lightly Played condition — see photos for exact details.",
    photos: [
      "images/full/c115_1.jpg",
      "images/full/c115_2.jpg",
      "images/full/c115_3.jpg"
    ]
  },
  {
    id: "c116", thumb: "images/grid/c116.jpg", number: "004/110", name: "Dark Blastoise (Holo)", set: "Legendary Collection · Holo",
    price: 200, condition: "Near Mint+", rare:true,
    description: "Dark Blastoise holo from Legendary Collection, graded Near Mint+ with sharp corners and a clean, bright foil finish.",
    photos: [
      "images/full/c116_1.jpg",
      "images/full/c116_2.jpg",
      "images/full/c116_3.jpg"
    ]
  },
  {
    id: "c117", thumb: "images/grid/c117.jpg", number: "011/110", name: "Gengar (Holo)", set: "Legendary Collection · Holo",
    price: 360, condition: "Near Mint", rare:true,
    description: "Gengar holo from Legendary Collection, Near Mint condition with clean corners and a bright, even foil finish.",
    photos: [
      "images/full/c117_1.jpg",
      "images/full/c117_2.jpg",
      "images/full/c117_3.jpg"
    ]
  },
  {
    id: "c118", thumb: "images/grid/c118.jpg", number: "001/105", name: "Dark Ampharos (1st Edition, Holo)", set: "Neo Destiny · 1st Edition · Holo",
    price: 340, condition: "Near Mint-", rare:true, sold:true,
    description: "Dark Ampharos 1st Edition holo from Neo Destiny, Near Mint- condition, priced to reflect light wear, see photos for exact details.",
    photos: [
      "images/full/c118_1.jpg"
    ]
  },
  {
    id: "c119", thumb: "images/grid/c119.jpg", number: "No. 094", name: "Gengar (Japanese, Swirl Holo) — Copy #1", set: "Japanese Fossil · Holo",
    price: 750, condition: "Near Mint+", rare:true, sold:true,
    description: "Japanese Fossil Gengar holo with the swirl foil pattern, first of three copies available, graded Near Mint+ with sharp corners and a clean, bright finish.",
    photos: [
      "images/full/c119_1.jpg"
    ]
  },
  {
    id: "c120", thumb: "images/grid/c120.jpg", number: "No. 094", name: "Gengar (Japanese, Swirl Holo) — Copy #2", set: "Japanese Fossil · Holo",
    price: 750, condition: "Near Mint+", rare:true,
    description: "Japanese Fossil Gengar holo with the swirl foil pattern, second of three copies available, graded Near Mint+ with sharp corners and a clean, bright finish.",
    photos: [
      "images/full/c120_1.jpg",
      "images/full/c120_2.jpg",
      "images/full/c120_3.jpg"
    ]
  },
  {
    id: "c121", thumb: "images/grid/c121.jpg", number: "No. 094", name: "Gengar (Japanese, Holo) — Copy #3", set: "Japanese Fossil · Holo",
    price: 750, condition: "Near Mint+", rare:true,
    description: "Japanese Fossil Gengar holo, third of three copies available, graded Near Mint+ with sharp corners and a clean, bright finish.",
    photos: [
      "images/full/c121_1.jpg",
      "images/full/c121_2.jpg",
      "images/full/c121_3.jpg"
    ]
  },
  {
    id: "c122", thumb: "images/grid/c122.jpg", number: "No. 145", name: "Zapdos (Japanese, Swirl Holo)", set: "Japanese Fossil · Holo",
    price: 70, condition: "Near Mint", rare:false, sold:true,
    description: "Japanese Fossil Zapdos holo with the swirl foil pattern, Near Mint condition with clean corners and a bright, even foil finish.",
    photos: [
      "images/full/c122_1.jpg"
    ]
  },
  {
    id: "c123", thumb: "images/grid/c123.jpg", number: "No. 135", name: "Jolteon (Japanese, Swirl Holo)", set: "Japanese Jungle · Holo",
    price: 85, condition: "Near Mint", rare:false, sold:true,
    description: "Japanese Jungle Jolteon holo with the swirl foil pattern, Near Mint condition with clean corners and a bright, even foil finish.",
    photos: [
      "images/full/c123_1.jpg"
    ]
  },
  {
    id: "c124", thumb: "images/grid/c124.jpg", number: "No. 143", name: "Snorlax (Japanese, Holo)", set: "Japanese Jungle · Holo",
    price: 150, condition: "Near Mint+", rare:true,
    description: "Japanese Jungle Snorlax holo, graded Near Mint+ with sharp corners and a clean, bright foil finish.",
    photos: [
      "images/full/c124_1.jpg",
      "images/full/c124_2.jpg",
      "images/full/c124_3.jpg"
    ]
  },
  {
    id: "c125", thumb: "images/grid/c125.jpg", number: "No. 034", name: "Giovanni's Nidoking (Japanese, Swirl Holo)", set: "Japanese Gym Challenge · Holo",
    price: 75, condition: "Near Mint+", rare:true,
    description: "Japanese Gym Challenge Giovanni's Nidoking holo with the swirl foil pattern, graded Near Mint+ with sharp corners and a clean, bright finish.",
    photos: [
      "images/full/c125_1.jpg",
      "images/full/c125_2.jpg",
      "images/full/c125_3.jpg"
    ]
  },
  {
    id: "c126", thumb: "images/grid/c126.jpg", number: "No. 055", name: "Misty's Psyduck (Japanese, Holo)", set: "Japanese Gym Heroes · Holo",
    price: 65, condition: "Near Mint", rare:false,
    description: "Japanese Gym Heroes Misty's Psyduck holo, Near Mint condition with clean corners and a bright, even foil finish.",
    photos: [
      "images/full/c126_1.jpg",
      "images/full/c126_2.jpg",
      "images/full/c126_3.jpg"
    ]
  },
  {
    id: "c127", thumb: "images/grid/c127.jpg", number: "021/110", name: "Latias", set: "Holon Phantoms · Reverse Holo",
    price: 385, condition: "Near Mint+", rare:true, sold:true,
    description: "Holon Phantoms Latias reverse holo, Near Mint+ condition with sharp corners and clean reverse holo foil.",
    photos: [
      "images/full/c127_1.jpg",
      "images/full/c127_2.jpg"
    ]
  },
  {
    id: "c128", thumb: "images/grid/c128.jpg", number: "012/110", name: "Latios", set: "Holon Phantoms · Reverse Holo",
    price: 385, condition: "Near Mint+", rare:true, sold:true,
    description: "Holon Phantoms Latios reverse holo, Near Mint+ condition with sharp corners and clean reverse holo foil.",
    photos: [
      "images/full/c128_1.jpg",
      "images/full/c128_2.jpg"
    ]
  },
  {
    id: "c129", thumb: "images/grid/c129.jpg", number: "HGSS20", name: "Entei", set: "HeartGold SoulSilver Promo (HGSS20) · Holo",
    price: 215, condition: "Lightly Played+", rare:true,
    description: "HeartGold SoulSilver promo Entei (HGSS20) holo, Lightly Played+ condition with minor edge wear and bright holo foil.",
    photos: [
      "images/full/c129_1.jpg",
      "images/full/c129_2.jpg"
    ]
  },
  {
    id: "c130", thumb: "images/grid/c130.jpg", number: "HGSS19", name: "Raikou", set: "HeartGold SoulSilver Promo · Holo",
    price: 90, condition: "Lightly Played-", rare:true,
    description: "HeartGold SoulSilver promo Raikou holo, Lightly Played- condition with some edge and corner wear.",
    photos: [
      "images/full/c130_1.jpg",
      "images/full/c130_2.jpg"
    ]
  },
  {
    id: "c131", thumb: "images/grid/c131.jpg", number: "057/100", name: "Mudkip", set: "Crystal Guardians · Reverse Holo",
    price: 80, condition: "Lightly Played", rare:false,
    description: "Crystal Guardians Mudkip reverse holo, Lightly Played condition with light surface and edge wear.",
    photos: [
      "images/full/c131_1.jpg",
      "images/full/c131_2.jpg"
    ]
  },
  {
    id: "c132", thumb: "images/grid/c132.jpg", number: "082/112", name: "Squirtle", set: "FireRed & LeafGreen · Reverse Holo",
    price: 285, condition: "Near Mint", rare:false, sold:true,
    description: "FireRed & LeafGreen Squirtle reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c132_1.jpg",
      "images/full/c132_2.jpg"
    ]
  },
  {
    id: "c133", thumb: "images/grid/c133.jpg", number: "070/112", name: "Nidoran", set: "FireRed & LeafGreen · Holo",
    price: 50, condition: "Near Mint", rare:false,
    description: "FireRed & LeafGreen Nidoran holo, Near Mint condition with clean corners and bright holo foil.",
    photos: [
      "images/full/c133_1.jpg",
      "images/full/c133_2.jpg"
    ]
  },
  {
    id: "c134", thumb: "images/grid/c134.jpg", number: "041/112", name: "Nidorino", set: "FireRed & LeafGreen · Holo",
    price: 75, condition: "Near Mint-", rare:false,
    description: "FireRed & LeafGreen Nidorino holo, Near Mint- condition with light corner wear and bright holo foil.",
    photos: [
      "images/full/c134_1.jpg",
      "images/full/c134_2.jpg"
    ]
  },
  {
    id: "c135", thumb: "images/grid/c135.jpg", number: "064/101", name: "Machop", set: "Hidden Legends · Reverse Holo",
    price: 20, condition: "Lightly Played", rare:false,
    description: "Hidden Legends Machop reverse holo, Lightly Played condition with light surface and edge wear.",
    photos: [
      "images/full/c135_1.jpg",
      "images/full/c135_2.jpg"
    ]
  },
  {
    id: "c136", thumb: "images/grid/c136.jpg", number: "063/112", name: "Gastly (Reverse Holo) — Copy #2", set: "FireRed & LeafGreen · Reverse Holo",
    price: 120, condition: "Lightly Played+", rare:false,
    description: "FireRed & LeafGreen Gastly reverse holo, Lightly Played+ condition with minor edge wear and bright holo foil.",
    photos: [
      "images/full/c136_1.jpg",
      "images/full/c136_2.jpg"
    ]
  },
  {
    id: "c137", thumb: "images/grid/c137.jpg", number: "048/110", name: "Persian", set: "Holon Phantoms · Reverse Holo",
    price: 145, condition: "Near Mint", rare:true,
    description: "Holon Phantoms Persian reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c137_1.jpg",
      "images/full/c137_2.jpg"
    ]
  },
  {
    id: "c138", thumb: "images/grid/c138.jpg", number: "054/115", name: "Cyndaquil (Copy #1)", set: "Unseen Forces · Reverse Holo",
    price: 125, condition: "Near Mint-", rare:false,
    description: "Unseen Forces Cyndaquil reverse holo, Near Mint- condition with light corner wear and clean foil.",
    photos: [
      "images/full/c138_1.jpg",
      "images/full/c138_2.jpg"
    ]
  },
  {
    id: "c139", thumb: "images/grid/c139.jpg", number: "054/115", name: "Cyndaquil (Copy #2)", set: "Unseen Forces · Reverse Holo",
    price: 165, condition: "Near Mint", rare:false,
    description: "Unseen Forces Cyndaquil reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c139_1.jpg",
      "images/full/c139_2.jpg"
    ]
  },
  {
    id: "c140", thumb: "images/grid/c140.jpg", number: "056/109", name: "Grimer", set: "Team Rocket Returns · Reverse Holo",
    price: 70, condition: "Lightly Played+", rare:false,
    description: "Team Rocket Returns Grimer reverse holo, Lightly Played+ condition with minor edge wear.",
    photos: [
      "images/full/c140_1.jpg",
      "images/full/c140_2.jpg"
    ]
  },
  {
    id: "c141", thumb: "images/grid/c141.jpg", number: "028/100", name: "Venusaur", set: "Crystal Guardians · Reverse Holo",
    price: 315, condition: "Near Mint", rare:true,
    description: "Crystal Guardians Venusaur reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c141_1.jpg",
      "images/full/c141_2.jpg"
    ]
  },
  {
    id: "c142", thumb: "images/grid/c142.jpg", number: "035/100", name: "Ivysaur (Crystal Guardians)", set: "Crystal Guardians · Reverse Holo",
    price: 95, condition: "Near Mint", rare:false,
    description: "Crystal Guardians Ivysaur reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c142_1.jpg",
      "images/full/c142_2.jpg"
    ]
  },
  {
    id: "c143", thumb: "images/grid/c143.jpg", number: "026/110", name: "Jynx", set: "Legendary Collection · Reverse Holo",
    price: 190, condition: "Lightly Played", rare:true,
    description: "Legendary Collection Jynx reverse holo, Lightly Played condition with some surface and edge wear.",
    photos: [
      "images/full/c143_1.jpg",
      "images/full/c143_2.jpg"
    ]
  },
  {
    id: "c144", thumb: "images/grid/c144.jpg", number: "063/112", name: "Gastly (Reverse Holo, Swirl) — Copy #3", set: "FireRed & LeafGreen · Reverse Holo (Swirl)",
    price: 80, condition: "Lightly Played", rare:false,
    description: "FireRed & LeafGreen Gastly swirl reverse holo, Lightly Played condition with some surface and edge wear.",
    photos: [
      "images/full/c144_1.jpg",
      "images/full/c144_2.jpg"
    ]
  },
  {
    id: "c145", thumb: "images/grid/c145.jpg", number: "035/112", name: "Ivysaur (FireRed & LeafGreen)", set: "FireRed & LeafGreen · Reverse Holo",
    price: 70, condition: "Lightly Played", rare:false,
    description: "FireRed & LeafGreen Ivysaur reverse holo, Lightly Played condition with some surface and edge wear.",
    photos: [
      "images/full/c145_1.jpg",
      "images/full/c145_2.jpg"
    ]
  },
  {
    id: "c146", thumb: "images/grid/c146.jpg", number: "068/092", name: "Voltorb (Copy #2)", set: "Legend Maker · Reverse Holo",
    price: 35, condition: "Lightly Played", rare:false,
    description: "Legend Maker Voltorb reverse holo, Lightly Played condition with some surface and edge wear.",
    photos: [
      "images/full/c146_1.jpg",
      "images/full/c146_2.jpg"
    ]
  },
  {
    id: "c147", thumb: "images/grid/c147.jpg", number: "001/107", name: "Altaria", set: "EX Deoxys · Reverse Holo",
    price: 180, condition: "Near Mint+", rare:false,
    description: "EX Deoxys Altaria reverse holo, Near Mint+ condition with sharp corners and clean reverse holo foil.",
    photos: [
      "images/full/c147_1.jpg",
      "images/full/c147_2.jpg"
    ]
  },
  {
    id: "c148", thumb: "images/grid/c148.jpg", number: "097/101", name: "Regice", set: "Hidden Legends · Cracked Ice Holo",
    price: 140, condition: "Lightly Played", rare:true,
    description: "Hidden Legends Regice cracked ice holo, Lightly Played condition with light surface and edge wear.",
    photos: [
      "images/full/c148_1.jpg",
      "images/full/c148_2.jpg"
    ]
  },
  {
    id: "c149", thumb: "images/grid/c149.jpg", number: "042/109", name: "Dark Wheezing", set: "Team Rocket Returns · Reverse Holo",
    price: 30, condition: "Moderately Played", rare:false,
    description: "Team Rocket Returns Dark Wheezing reverse holo, Moderately Played condition with visible surface and edge wear.",
    photos: [
      "images/full/c149_1.jpg",
      "images/full/c149_2.jpg"
    ]
  },
  {
    id: "c150", thumb: "images/grid/c150.jpg", number: "038/113", name: "Ditto (Mr. Mime)", set: "EX Delta Species · Reverse Holo",
    price: 220, condition: "Lightly Played", rare:true,
    description: "EX Delta Species Ditto (Mr. Mime) reverse holo, Lightly Played condition with light surface and edge wear.",
    photos: [
      "images/full/c150_1.jpg",
      "images/full/c150_2.jpg"
    ]
  },
  {
    id: "c151", thumb: "images/grid/c151.jpg", number: "022/095", name: "Umbreon", set: "Call of Legends · Holo",
    price: 450, condition: "Near Mint", rare:true, sold:true,
    description: "Call of Legends Umbreon holo, Near Mint condition with clean corners and bright holo foil.",
    photos: [
      "images/full/c151_1.jpg",
      "images/full/c151_2.jpg"
    ]
  },
  {
    id: "c152", thumb: "images/grid/c152.jpg", number: "041/110", name: "Dodrio", set: "Legendary Collection · Reverse Holo",
    price: 195, condition: "Near Mint", rare:false,
    description: "Legendary Collection Dodrio reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c152_1.jpg",
      "images/full/c152_2.jpg"
    ]
  },
  {
    id: "c153", thumb: "images/grid/c153.jpg", number: "048/092", name: "Aron (Swirl Holo)", set: "Legend Maker · Reverse Holo (Swirl)",
    price: 55, condition: "Lightly Played", rare:false,
    description: "Legend Maker Aron swirl reverse holo, Lightly Played condition with light surface and edge wear.",
    photos: [
      "images/full/c153_1.jpg",
      "images/full/c153_2.jpg"
    ]
  },
  {
    id: "c154", thumb: "images/grid/c154.jpg", number: "004/092", name: "Delcatty", set: "Legend Maker · Reverse Holo",
    price: 65, condition: "Near Mint", rare:false,
    description: "Legend Maker Delcatty reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c154_1.jpg",
      "images/full/c154_2.jpg"
    ]
  },
  {
    id: "c155", thumb: "images/grid/c155.jpg", number: "098/101", name: "Regirock ex", set: "Hidden Legends · Cracked Ice Holo",
    price: 275, condition: "Near Mint", rare:true, sold:true,
    description: "Hidden Legends Regirock ex cracked ice holo, Near Mint condition with clean corners and bright foil.",
    photos: [
      "images/full/c155_1.jpg",
      "images/full/c155_2.jpg"
    ]
  },
  {
    id: "c156", thumb: "images/grid/c156.jpg", number: "012/101", name: "Typhlosion", set: "Dragon Frontiers · Reverse Holo",
    price: 260, condition: "Near Mint", rare:false,
    description: "Dragon Frontiers Typhlosion reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c156_1.jpg",
      "images/full/c156_2.jpg"
    ]
  },
  {
    id: "c157", thumb: "images/grid/c157.jpg", number: "026/109", name: "Quagsire", set: "EX Team Rocket Returns · Reverse Holo",
    price: 150, condition: "Lightly Played+", rare:false,
    description: "EX Team Rocket Returns Quagsire reverse holo, Lightly Played+ condition with minor edge wear.",
    photos: [
      "images/full/c157_1.jpg",
      "images/full/c157_2.jpg"
    ]
  },
  {
    id: "c158", thumb: "images/grid/c158.jpg", number: "028/092", name: "Wobbuffet", set: "Legend Maker · Reverse Holo",
    price: 35, condition: "Lightly Played", rare:false,
    description: "Legend Maker Wobbuffet reverse holo, Lightly Played condition with light surface and edge wear.",
    photos: [
      "images/full/c158_1.jpg",
      "images/full/c158_2.jpg"
    ]
  },
  {
    id: "c159", thumb: "images/grid/c159.jpg", number: "053/092", name: "Geodude", set: "Legend Maker · Reverse Holo",
    price: 80, condition: "Near Mint", rare:false,
    description: "Legend Maker Geodude reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c159_1.jpg",
      "images/full/c159_2.jpg"
    ]
  },
  {
    id: "c160", thumb: "images/grid/c160.jpg", number: "024/092", name: "Pinsir", set: "Legend Maker · Reverse Holo",
    price: 85, condition: "Lightly Played+", rare:false,
    description: "Legend Maker Pinsir reverse holo, Lightly Played+ condition with minor edge wear.",
    photos: [
      "images/full/c160_1.jpg",
      "images/full/c160_2.jpg"
    ]
  },
  {
    id: "c161", thumb: "images/grid/c161.jpg", number: "057/092", name: "Machop", set: "Legend Maker · Reverse Holo",
    price: 95, condition: "Near Mint", rare:false,
    description: "Legend Maker Machop reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c161_1.jpg",
      "images/full/c161_2.jpg"
    ]
  },
  {
    id: "c162", thumb: "images/grid/c162.jpg", number: "089/147", name: "Larvitar", set: "Aquapolis · Reverse Holo",
    price: 95, condition: "Lightly Played+", rare:false,
    description: "Aquapolis Larvitar reverse holo, Lightly Played+ condition with minor edge wear.",
    photos: [
      "images/full/c162_1.jpg",
      "images/full/c162_2.jpg"
    ]
  },
  {
    id: "c163", thumb: "images/grid/c163.jpg", number: "006/092", name: "Golem (Copy #3)", set: "Legend Maker · Reverse Holo",
    price: 40, condition: "Lightly Played-", rare:false,
    description: "Legend Maker Golem reverse holo, Lightly Played- condition with noticeable edge and corner wear.",
    photos: [
      "images/full/c163_1.jpg",
      "images/full/c163_2.jpg"
    ]
  },
  {
    id: "c164", thumb: "images/grid/c164.jpg", number: "006/092", name: "Golem (Copy #2)", set: "Legend Maker · Reverse Holo",
    price: 125, condition: "Near Mint", rare:false, sold:true,
    description: "Legend Maker Golem reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c164_1.jpg",
      "images/full/c164_2.jpg"
    ]
  },
  {
    id: "c165", thumb: "images/grid/c165.jpg", number: "040/092", name: "Misdreavus (Copy #3)", set: "Legend Maker · Reverse Holo",
    price: 45, condition: "Lightly Played+", rare:false,
    description: "Legend Maker Misdreavus reverse holo, Lightly Played+ condition with minor edge wear.",
    photos: [
      "images/full/c165_1.jpg",
      "images/full/c165_2.jpg"
    ]
  },
  {
    id: "c166", thumb: "images/grid/c166.jpg", number: "032/092", name: "Electrode (Swirl Holo)", set: "Legend Maker · Reverse Holo (Swirl)",
    price: 85, condition: "Near Mint", rare:false,
    description: "Legend Maker Electrode swirl reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c166_1.jpg",
      "images/full/c166_2.jpg"
    ]
  },
  {
    id: "c167", thumb: "images/grid/c167.jpg", number: "068/092", name: "Voltorb (Copy #3, Swirl Holo)", set: "Legend Maker · Reverse Holo (Swirl)",
    price: 70, condition: "Near Mint", rare:false,
    description: "Legend Maker Voltorb swirl reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c167_1.jpg",
      "images/full/c167_2.jpg"
    ]
  },
  {
    id: "c168", thumb: "images/grid/c168.jpg", number: "044/092", name: "Tangela", set: "Legend Maker · Reverse Holo",
    price: 70, condition: "Lightly Played+", rare:false,
    description: "Legend Maker Tangela reverse holo, Lightly Played+ condition with minor edge wear.",
    photos: [
      "images/full/c168_1.jpg",
      "images/full/c168_2.jpg"
    ]
  },
  {
    id: "c169", thumb: "images/grid/c169.jpg", number: "015/109", name: "Dragonite", set: "EX Team Rocket Returns · Holo",
    price: 550, condition: "Near Mint", rare:false,
    description: "EX Team Rocket Returns Dragonite holo, Near Mint condition with clean corners and bright holo foil.",
    photos: [
      "images/full/c169_1.jpg",
      "images/full/c169_2.jpg"
    ]
  },
  {
    id: "c170", thumb: "images/grid/c170.jpg", number: "016/110", name: "Rayquaza", set: "Holon Phantoms · Reverse Holo",
    price: 1750, condition: "Near Mint", rare:true, sold:true,
    description: "Holon Phantoms Rayquaza reverse holo, Near Mint condition with sharp corners and clean reverse holo foil.",
    photos: [
      "images/full/c170_1.jpg",
      "images/full/c170_2.jpg"
    ]
  },
  {
    id: "c171", thumb: "images/grid/c171.jpg", number: "008/101", name: "Ninetales", set: "Dragon Frontiers · Reverse Holo",
    price: 350, condition: "Lightly Played+", rare:false, sold:true,
    description: "Dragon Frontiers Ninetales reverse holo, Lightly Played+ condition with minor edge wear.",
    photos: [
      "images/full/c171_1.jpg",
      "images/full/c171_2.jpg"
    ]
  },
  {
    id: "c172", thumb: "images/grid/c172.jpg", number: "034/109", name: "Dark Golbat", set: "EX Team Rocket Returns · Reverse Holo",
    price: 125, condition: "Near Mint", rare:false, sold:true,
    description: "EX Team Rocket Returns Dark Golbat reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c172_1.jpg",
      "images/full/c172_2.jpg"
    ]
  },
  {
    id: "c173", thumb: "images/grid/c173.jpg", number: "069/109", name: "Onix", set: "EX Team Rocket Returns · Reverse Holo",
    price: 95, condition: "Near Mint+", rare:false, sold:true,
    description: "EX Team Rocket Returns Onix reverse holo, Near Mint+ condition with sharp corners and clean reverse holo foil.",
    photos: [
      "images/full/c173_1.jpg",
      "images/full/c173_2.jpg"
    ]
  },
  {
    id: "c174", thumb: "images/grid/c174.jpg", number: "010/101", name: "Snorlax", set: "Dragon Frontiers · Reverse Holo",
    price: 750, condition: "Near Mint", rare:true, sold:true,
    description: "Dragon Frontiers Snorlax reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c174_1.jpg",
      "images/full/c174_2.jpg"
    ]
  },
  {
    id: "c175", thumb: "images/grid/c175.jpg", number: "007/092", name: "Kabutops (Copy #1, Swirl Holo)", set: "Legend Maker · Reverse Holo (Swirl)",
    price: 195, condition: "Near Mint", rare:false,
    description: "Legend Maker Kabutops swirl reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c175_1.jpg",
      "images/full/c175_2.jpg"
    ]
  },
  {
    id: "c176", thumb: "images/grid/c176.jpg", number: "007/092", name: "Kabutops (Copy #2)", set: "Legend Maker · Reverse Holo",
    price: 175, condition: "Near Mint", rare:false,
    description: "Legend Maker Kabutops reverse holo, Near Mint condition with clean corners and bright reverse holo foil.",
    photos: [
      "images/full/c176_1.jpg",
      "images/full/c176_2.jpg"
    ]
  },
  {
    id: "c177", thumb: "images/grid/c177.jpg", number: "017/115", name: "Typhlosion (Reverse Holo) (Copy #2)", set: "EX Unseen Forces",
    price: 250, condition: "Lightly Played+", rare:true,
    description: "Typhlosion in the EX Unseen Forces reverse holo finish, Lightly Played+ condition. This is a second copy.",
    photos: [
      "images/full/c177_1.jpg",
      "images/full/c177_2.jpg"
    ]
  },

  {
    id: "c178", thumb: "images/grid/c178.jpg", number: "019/112", name: "Chansey (Reverse Holo)", set: "EX FireRed & LeafGreen",
    price: 135, condition: "Lightly Played+", rare:false,
    description: "Chansey reverse holo from EX FireRed & LeafGreen, Lightly Played+ condition.",
    photos: [
      "images/full/c178_1.jpg",
      "images/full/c178_2.jpg"
    ]
  },

  {
    id: "c179", thumb: "images/grid/c179.jpg", number: "063/112", name: "Gastly (Reverse Holo) — Copy #4", set: "EX FireRed & LeafGreen · Reverse Holo",
    price: 120, condition: "Lightly Played+", rare:false,
    description: "Gastly reverse holo from EX FireRed & LeafGreen, Lightly Played+ condition.",
    photos: [
      "images/full/c179_1.jpg",
      "images/full/c179_2.jpg"
    ]
  },

  {
    id: "c180", thumb: "images/grid/c180.jpg", number: "013/113", name: "Rayquaza \u03b4 (Delta Species, Reverse Holo)", set: "EX Delta Species · 13/113 · Rare Holo ex",
    price: 500, condition: "Near Mint-", rare:true, sold:true,
    description: "Rayquaza \u03b4 Delta Species from EX Delta Species, a dual Lightning/Metal type with the Delta Guard Poke-Body, in the reverse holo finish. Near Mint- condition.",
    photos: [
      "images/full/c180_1.jpg",
      "images/full/c180_2.jpg"
    ]
  },
  {
    id: "c181", thumb: "images/grid/c181.jpg", number: "064/107", name: "Magikarp (Reverse Holo) — Copy #3", set: "EX Deoxys · 64/107 · Common",
    price: 335, condition: "Near Mint", rare:false,
    description: "Magikarp from EX Deoxys in the reverse holo finish, the third copy available. Near Mint condition.",
    photos: [
      "images/full/c181_1.jpg",
      "images/full/c181_2.jpg"
    ]
  },
  {
    id: "c182", thumb: "images/grid/c182.jpg", number: "001/092", name: "Aerodactyl (Reverse Holo)", set: "EX Legend Maker · 1/92 · Rare Holo",
    price: 235, condition: "Lightly Played", rare:true,
    description: "Aerodactyl from EX Legend Maker with the Reactive Protection Poke-Body, in the reverse holo finish. Lightly Played condition.",
    photos: [
      "images/full/c182_1.jpg",
      "images/full/c182_2.jpg"
    ]
  },
  {
    id: "c183", thumb: "images/grid/c183.jpg", number: "002/106", name: "Deoxys (Reverse Holo) — Copy #2", set: "EX Emerald · 2/106 · Rare Holo",
    price: 800, condition: "Near Mint", rare:true,
    description: "Deoxys from EX Emerald with the Form Change Poke-Power, in the reverse holo finish, the second copy available. Near Mint condition.",
    photos: [
      "images/full/c183_1.jpg",
      "images/full/c183_2.jpg"
    ]
  },
  {
    id: "c184", thumb: "images/grid/c184.jpg", number: "053/109", name: "Dratini (Holo, Swirl) — Copy #2", set: "EX Team Rocket Returns · 53/109 · Common",
    price: 145, condition: "Near Mint-", rare:false,
    description: "Dratini from EX Team Rocket Returns in the holo swirl finish, the second copy available. Near Mint- condition.",
    photos: [
      "images/full/c184_1.jpg",
      "images/full/c184_2.jpg"
    ]
  },
  {
    id: "c185", thumb: "images/grid/c185.jpg", number: "052/109", name: "Dratini (Reverse Holo, Swirl)", set: "EX Team Rocket Returns · 52/109 · Common",
    price: 145, condition: "Near Mint-", rare:false,
    description: "Dratini from EX Team Rocket Returns in the reverse holo swirl finish. Near Mint- condition.",
    photos: [
      "images/full/c185_1.jpg",
      "images/full/c185_2.jpg"
    ]
  },
  {
    id: "c186", thumb: "images/grid/c186.jpg", number: "005/109", name: "Dark Houndoom (Reverse Holo)", set: "EX Team Rocket Returns · 5/109 · Rare Holo",
    price: 295, condition: "Lightly Played+", rare:true,
    description: "Dark Houndoom from EX Team Rocket Returns, a dual Fire/Darkness type, in the reverse holo finish. Lightly Played+ condition.",
    photos: [
      "images/full/c186_1.jpg",
      "images/full/c186_2.jpg"
    ]
  },
  {
    id: "c187", thumb: "images/grid/c187.jpg", number: "005/092", name: "Gengar (Reverse Holo) — Copy #3", set: "EX Legend Maker · 5/92 · Rare Holo",
    price: 2000, condition: "Near Mint+", rare:true, sold:true,
    description: "Gengar's Shadow Curse power makes it a menace even after it's knocked out, printed here in the Legend Maker reverse holo finish. Near Mint+ condition.",
    photos: [
      "images/full/c187_1.jpg",
      "images/full/c187_2.jpg"
    ]
  },
  {
    id: "c188", thumb: "images/grid/c188.jpg", number: "005/092", name: "Gengar (Holo, Swirl) — Copy #2", set: "EX Legend Maker · 5/92 · Rare Holo",
    price: 285, condition: "Near Mint", rare:true,
    description: "Gengar from EX Legend Maker in the holo swirl finish, see photos for the exact foil pattern. Near Mint condition.",
    photos: [
      "images/full/c188_1.jpg",
      "images/full/c188_2.jpg"
    ]
  },
  {
    id: "c189", thumb: "images/grid/c189.jpg", number: "004/110", name: "Dark Blastoise (Reverse Holo)", set: "Legendary Collection · 4/110 · Rare Holo",
    price: 1700, condition: "Near Mint", rare:true, sold:true,
    description: "Dark Blastoise from Legendary Collection, evolving from Dark Wartortle with Hydrocannon and Rocket Tackle, in the reverse holo finish. Near Mint condition.",
    photos: [
      "images/full/c189_1.jpg",
      "images/full/c189_2.jpg"
    ]
  },

  {
    id: "c190", thumb: "images/grid/c190.jpg", number: "083/110", name: "Torchic (Reverse Holo)", set: "EX Holon Phantoms · 83/110 · Common",
    price: 140, condition: "Near Mint", rare:false, sold:true,
    description: "Torchic from EX Holon Phantoms in the reverse holo finish. Near Mint condition.",
    photos: [
      "images/full/c190_1.jpg",
      "images/full/c190_2.jpg"
    ]
  },
  {
    id: "c191", thumb: "images/grid/c191.jpg", number: "028/110", name: "Regirock (Reverse Holo) — Copy #1", set: "EX Holon Phantoms · 28/110 · Rare",
    price: 90, condition: "Near Mint", rare:false,
    description: "Regirock from EX Holon Phantoms with the Clear Body Poke-Body, in the reverse holo finish, the first of two copies available. Near Mint condition.",
    photos: [
      "images/full/c191_1.jpg",
      "images/full/c191_2.jpg"
    ]
  },
  {
    id: "c192", thumb: "images/grid/c192.jpg", number: "028/110", name: "Regirock (Reverse Holo) — Copy #2", set: "EX Holon Phantoms · 28/110 · Rare",
    price: 125, condition: "Near Mint+", rare:false, sold:true,
    description: "Regirock from EX Holon Phantoms with the Clear Body Poke-Body, in the reverse holo finish, the second of two copies available. Near Mint+ condition.",
    photos: [
      "images/full/c192_1.jpg",
      "images/full/c192_2.jpg"
    ]
  },
  {
    id: "c193", thumb: "images/grid/c193.jpg", number: "SL4/95", name: "Groudon (Shiny)", set: "Call of Legends · SL4/95 · Shiny Holo Rare",
    price: 825, condition: "Near Mint", rare:true,
    description: "Groudon Shiny secret rare from Call of Legends, Volcano Stomp attack, Near Mint condition.",
    photos: [
      "images/full/c193_1.jpg",
      "images/full/c193_2.jpg"
    ]
  },

  {
    id: "c194", thumb: "images/grid/c194.jpg", number: "097/101", name: "Regice ex", set: "EX Team Magma vs Team Aqua · 97/101 · Rare Holo",
    price: 275, condition: "Near Mint", rare:true, sold:true,
    description: "Regice ex from EX Team Magma vs Team Aqua with the Crystal Body Poke-Body and Freeze Lock attack, Near Mint condition.",
    photos: [
      "images/full/c194_1.jpg",
      "images/full/c194_2.jpg",
      "images/full/c194_3.jpg"
    ]
  },

];


