#!/usr/bin/env node
/**
 * Builds src/nutrition/generic.json: everyday foods with Italian names and
 * household portions, nutrients per 100 g (per 100 ml for drinks).
 *
 * Values come from USDA FoodData Central SR Legacy (public domain) as
 * packaged by tempo-food-db (TempoLife, CC BY 4.0). Foods missing there
 * (Italian specialities, sodas) use typical label values, marked "label".
 *
 * Usage: node scripts/build-foods.js
 *
 * Output: { v, foods: [id, name, category, unit, kcal, protein, carbs, fat,
 *   fiber, sugar, satFat, salt, portions | 0][] }  — portions: [label, g][]
 */
const fs = require('fs');
const path = require('path');

const data = require('tempo-food-db/data/tempolife-foods.json');
const usda = new Map();
for (const x of data) {
  if (x.source === 'usda_sr_legacy' && !usda.has(x.name)) usda.set(x.name, x);
}

// Typical label values for foods SR Legacy lacks: kcal, p, c, f, fiber, sugar, sat, salt.
const L = (kcal, p, c, f, fiber = 0, sugar = 0, sat = 0, salt = 0) => ({
  kcal,
  p,
  c,
  f,
  fiber,
  sugar,
  sat,
  salt,
});

const SLICE = (g = 30) => [['fetta', g]];
const SPOON = [
  ['cucchiaio', 10],
  ['cucchiaino', 4],
];

// [id, name, category, source, portions?, unit?]
// prettier-ignore
const FOODS = [
  // Pasta, riso, pane e cereali
  ['pasta', 'Pasta di semola (cruda)', 'cereali', 'Pasta, dry', [['porzione', 80]]],
  ['pasta-cotta', 'Pasta di semola (cotta)', 'cereali', 'Pasta, cooked, without added salt', [['porzione', 200]]],
  ['pasta-integrale', 'Pasta integrale (cruda)', 'cereali', 'Pasta, whole-wheat, dry', [['porzione', 80]]],
  ['pasta-integrale-cotta', 'Pasta integrale (cotta)', 'cereali', 'Pasta, whole-wheat, cooked', [['porzione', 200]]],
  ['pasta-fresca', "Pasta fresca all'uovo (cruda)", 'cereali', 'Pasta, fresh-refrigerated, plain', [['porzione', 120]]],
  ['pasta-uovo-secca', "Pasta all'uovo secca (cruda)", 'cereali', 'Noodles, egg, dry', [['porzione', 80]]],
  ['gnocchi', 'Gnocchi di patate', 'cereali', L(152, 3.6, 33, 0.3, 1.8, 0.6, 0.1, 0.9), [['porzione', 200]]],
  ['riso', 'Riso bianco (crudo)', 'cereali', 'Rice, white, long-grain, raw', [['porzione', 80]]],
  ['riso-cotto', 'Riso bianco (cotto)', 'cereali', 'Rice, white, long-grain, cooked without salt', [['porzione', 200]]],
  ['riso-integrale', 'Riso integrale (crudo)', 'cereali', 'Rice, brown, long-grain, raw', [['porzione', 80]]],
  ['riso-integrale-cotto', 'Riso integrale (cotto)', 'cereali', 'Rice, brown, long-grain, cooked', [['porzione', 200]]],
  ['riso-parboiled', 'Riso parboiled (crudo)', 'cereali', 'Rice, white, long-grain, parboiled, dry', [['porzione', 80]]],
  ['pane', 'Pane bianco', 'cereali', 'Bread, white', SLICE(30)],
  ['pane-integrale', 'Pane integrale', 'cereali', 'Bread, wheat', SLICE(30)],
  ['pane-segale', 'Pane di segale', 'cereali', 'Bread, rye', SLICE(30)],
  ['baguette', 'Pane tipo baguette / francese', 'cereali', 'Bread, french or vienna', SLICE(30)],
  ['pane-tostato', 'Pane tostato', 'cereali', 'Bread, white, toasted', SLICE(25)],
  ['fette-biscottate', 'Fette biscottate', 'cereali', L(408, 11.3, 75, 6, 3.5, 6, 1, 1.1), [['fetta', 8]]],
  ['crackers', 'Crackers', 'cereali', 'Crackers, saltines', [['pacchetto', 25]]],
  ['grissini', 'Grissini', 'cereali', L(412, 12, 68, 9.5, 3.5, 3, 1.5, 2), [['grissino', 6]]],
  ['piadina', 'Piadina / tortilla', 'cereali', 'Tortillas, ready-to-bake or -fry, flour, shelf stable', [['piadina', 80]]],
  ['gallette-riso', 'Gallette di riso', 'cereali', 'Snacks, rice cakes, brown rice, plain, unsalted', [['galletta', 8]]],
  ['gallette-mais', 'Gallette di mais', 'cereali', 'Snacks, corn cakes', [['galletta', 8]]],
  ['avena', "Fiocchi d'avena", 'cereali', 'Cereals, oats, regular and quick, not fortified, dry', [['porzione', 40]]],
  ['corn-flakes', 'Corn flakes', 'cereali', 'Cereals ready-to-eat, RALSTON Corn Flakes', [['tazza', 30]]],
  ['muesli', 'Muesli', 'cereali', L(363, 9.7, 66, 6, 7.5, 16, 1, 0.1), [['porzione', 40]]],
  ['granola', 'Granola', 'cereali', 'Cereals ready-to-eat, granola, homemade', [['porzione', 40]]],
  ['farina', 'Farina di frumento 00', 'cereali', 'Wheat flour, white, all-purpose', SPOON.slice(0, 1)],
  ['farina-integrale', 'Farina integrale', 'cereali', 'Wheat flour, whole-grain', SPOON.slice(0, 1)],
  ['orzo', 'Orzo perlato (crudo)', 'cereali', 'Barley, pearled, raw', [['porzione', 80]]],
  ['farro', 'Farro (crudo)', 'cereali', 'Spelt, uncooked', [['porzione', 80]]],
  ['quinoa', 'Quinoa (cruda)', 'cereali', 'Quinoa, uncooked', [['porzione', 80]]],
  ['quinoa-cotta', 'Quinoa (cotta)', 'cereali', 'Quinoa, cooked', [['porzione', 180]]],
  ['couscous', 'Cous cous (crudo)', 'cereali', 'Couscous, dry', [['porzione', 80]]],
  ['polenta', 'Farina di mais per polenta', 'cereali', 'Cornmeal, degermed, yellow', [['porzione', 80]]],
  ['popcorn', 'Popcorn', 'cereali', 'Snacks, popcorn, air-popped', [['ciotola', 25]]],

  // Patate e tuberi
  ['patate', 'Patate (crude)', 'tuberi', 'Potatoes, flesh and skin, raw', [['patata media', 150]]],
  ['patate-bollite', 'Patate bollite', 'tuberi', 'Potatoes, boiled, cooked without skin, flesh, without salt', [['patata media', 150]]],
  ['patate-forno', 'Patate al forno', 'tuberi', 'Potatoes, baked, flesh and skin, without salt', [['porzione', 200]]],
  ['patatine-fritte', 'Patatine fritte', 'tuberi', 'Fast foods, potato, french fried in vegetable oil', [['porzione media', 115]]],
  ['patatine-busta', 'Patatine in busta', 'tuberi', 'Snacks, potato chips, plain, salted', [['busta piccola', 25]]],
  ['patate-dolci', 'Patate dolci', 'tuberi', 'Sweet potato, raw, unprepared', [['patata media', 150]]],

  // Legumi
  ['ceci', 'Ceci (cotti / in scatola)', 'legumi', 'Chickpeas (garbanzo beans, bengal gram), mature seeds, canned, drained solids', [['scatola sgocciolata', 240], ['porzione', 150]]],
  ['ceci-secchi', 'Ceci secchi', 'legumi', 'Chickpeas (garbanzo beans, bengal gram), mature seeds, raw', [['porzione', 50]]],
  ['lenticchie', 'Lenticchie (cotte)', 'legumi', 'Lentils, mature seeds, cooked, boiled, without salt', [['porzione', 150]]],
  ['lenticchie-secche', 'Lenticchie secche', 'legumi', 'Lentils, raw', [['porzione', 50]]],
  ['borlotti', 'Fagioli borlotti (cotti)', 'legumi', 'Beans, cranberry (roman), mature seeds, cooked, boiled', [['porzione', 150]]],
  ['cannellini', 'Fagioli cannellini (cotti)', 'legumi', 'Beans, white, mature seeds, cooked, boiled', [['scatola sgocciolata', 240], ['porzione', 150]]],
  ['fagioli-neri', 'Fagioli neri (cotti)', 'legumi', 'Beans, black, mature seeds, cooked, boiled', [['porzione', 150]]],
  ['fagioli-rossi', 'Fagioli rossi (cotti)', 'legumi', 'Beans, kidney, red, mature seeds, cooked', [['porzione', 150]]],
  ['piselli', 'Piselli', 'legumi', 'Peas, green, frozen, cooked, boiled', [['porzione', 150]]],
  ['fave', 'Fave (cotte)', 'legumi', 'Broadbeans (fava beans), mature seeds, cooked, boiled, with salt', [['porzione', 150]]],
  ['edamame', 'Edamame', 'legumi', 'Edamame, frozen, prepared', [['porzione', 100]]],
  ['tofu', 'Tofu', 'legumi', 'Tofu, raw, firm, prepared with calcium sulfate', [['panetto', 125]]],
  ['tempeh', 'Tempeh', 'legumi', 'Tempeh', [['porzione', 100]]],
  ['seitan', 'Seitan', 'legumi', L(120, 22, 4, 1.5, 0.5, 0.5, 0.2, 1.2), [['porzione', 100]]],
  ['hummus', 'Hummus', 'legumi', 'Hummus, commercial', [['cucchiaio', 15]]],

  // Carne
  ['pollo-petto', 'Petto di pollo (crudo)', 'carne', L(110, 23.1, 0, 1.2, 0, 0, 0.3, 0.2), [['porzione', 150]]],
  ['pollo-petto-cotto', 'Petto di pollo (cotto)', 'carne', 'Chicken, breast, meat only, cooked, roasted', [['porzione', 120]]],
  ['pollo-coscia', 'Coscia di pollo senza pelle (cruda)', 'carne', 'Chicken, dark meat, thigh, meat only, raw', [['coscia', 120]]],
  ['pollo-coscia-pelle', 'Coscia di pollo con pelle (cruda)', 'carne', 'Chicken, thigh, meat and skin, raw', [['coscia', 150]]],
  ['tacchino', 'Fesa di tacchino (cruda)', 'carne', 'Turkey, retail parts, breast, meat only, raw', [['porzione', 150]]],
  ['tacchino-cotto', 'Fesa di tacchino (cotta)', 'carne', 'Turkey, retail parts, breast, meat only, cooked', [['porzione', 120]]],
  ['macinato-5', 'Macinato di manzo magro 5%', 'carne', 'Beef, ground, 95% lean meat / 5% fat, raw', [['porzione', 150]]],
  ['macinato-10', 'Macinato di manzo 10%', 'carne', 'Beef, ground, 90% lean meat / 10% fat, raw', [['porzione', 150]]],
  ['macinato-15', 'Macinato di manzo 15%', 'carne', 'Beef, ground, 85% lean meat / 15% fat, raw', [['porzione', 150]]],
  ['macinato-20', 'Macinato di manzo 20%', 'carne', 'Beef, ground, 80% lean meat / 20% fat, raw', [['porzione', 150]]],
  ['bistecca', 'Bistecca di manzo (cruda)', 'carne', 'Beef, top sirloin, steak, raw', [['bistecca', 200]]],
  ['filetto', 'Filetto di manzo (crudo)', 'carne', 'Beef, tenderloin, steak, raw', [['porzione', 180]]],
  ['vitello', 'Vitello (crudo)', 'carne', 'Veal, leg (top round), raw', [['porzione', 150]]],
  ['maiale-lonza', 'Lonza di maiale (cruda)', 'carne', 'Pork, fresh, loin, tenderloin, raw', [['porzione', 150]]],
  ['maiale-costine', 'Costine di maiale (crude)', 'carne', 'Pork, fresh, spareribs, raw', [['porzione', 200]]],
  ['agnello', 'Agnello (crudo)', 'carne', 'Lamb, leg, whole (shank and sirloin), raw', [['porzione', 150]]],
  ['coniglio', 'Coniglio (crudo)', 'carne', 'Game meat, rabbit, domesticated, raw', [['porzione', 150]]],
  ['salsiccia', 'Salsiccia di maiale (cruda)', 'carne', 'Sausage, Italian, pork, mild, raw', [['salsiccia', 100]]],
  ['hamburger-manzo', 'Hamburger di manzo (crudo)', 'carne', 'Beef, ground, 85% lean meat / 15% fat, raw', [['hamburger', 100]]],

  // Salumi
  ['prosciutto-crudo', 'Prosciutto crudo', 'salumi', L(250, 25.5, 0, 16.5, 0, 0, 5.5, 5), [['fetta', 15]]],
  ['prosciutto-cotto', 'Prosciutto cotto', 'salumi', 'Ham, sliced, regular (approximately 11% fat)', [['fetta', 20]]],
  ['bresaola', 'Bresaola', 'salumi', 'Beef, cured, dried', [['fetta', 10]]],
  ['salame', 'Salame', 'salumi', 'Salami, Italian, pork', [['fetta', 10]]],
  ['mortadella', 'Mortadella', 'salumi', 'Bologna, pork', [['fetta', 20]]],
  ['affettato-tacchino', 'Fesa di tacchino affettata', 'salumi', 'Turkey breast, sliced, prepackaged', [['fetta', 15]]],
  ['wurstel', 'Würstel', 'salumi', 'Frankfurter, pork', [['würstel', 50]]],
  ['pancetta', 'Pancetta', 'salumi', 'Pork, cured, bacon, unprepared', [['fetta', 10]]],
  ['speck', 'Speck', 'salumi', L(300, 28, 0, 20, 0, 0, 7.5, 5), [['fetta', 10]]],

  // Pesce
  ['tonno', 'Tonno fresco', 'pesce', 'Fish, tuna, fresh, yellowfin, raw', [['trancio', 150]]],
  ['tonno-naturale', 'Tonno al naturale (sgocciolato)', 'pesce', 'Fish, tuna, light, canned in water, drained solids', [['scatoletta', 52]]],
  ['tonno-olio', "Tonno sott'olio (sgocciolato)", 'pesce', 'Fish, tuna, light, canned in oil, drained solids', [['scatoletta', 52]]],
  ['salmone', 'Salmone', 'pesce', 'Fish, salmon, Atlantic, farmed, raw', [['trancio', 150]]],
  ['salmone-affumicato', 'Salmone affumicato', 'pesce', 'Fish, salmon, chinook, smoked', [['confezione', 100]]],
  ['merluzzo', 'Merluzzo', 'pesce', 'Fish, cod, Atlantic, raw', [['filetto', 150]]],
  ['branzino', 'Branzino / spigola', 'pesce', 'Fish, sea bass, mixed species, raw', [['filetto', 150]]],
  ['orata', 'Orata', 'pesce', L(121, 20.7, 0, 3.8, 0, 0, 1, 0.2), [['filetto', 150]]],
  ['sgombro', 'Sgombro', 'pesce', 'Fish, mackerel, Atlantic, raw', [['filetto', 150]]],
  ['sardine', "Sardine sott'olio", 'pesce', 'Fish, sardine, Atlantic, canned in oil, drained solids with bone', [['scatoletta', 85]]],
  ['alici', 'Alici / acciughe', 'pesce', 'Fish, anchovy, european, raw', [['porzione', 150]]],
  ['pesce-spada', 'Pesce spada', 'pesce', 'Fish, swordfish, raw', [['trancio', 150]]],
  ['trota', 'Trota', 'pesce', 'Fish, trout, rainbow, farmed, raw', [['filetto', 150]]],
  ['gamberi', 'Gamberi', 'pesce', 'Crustaceans, shrimp, raw', [['porzione', 150]]],
  ['calamari', 'Calamari', 'pesce', 'Mollusks, squid, mixed species, raw', [['porzione', 150]]],
  ['polpo', 'Polpo', 'pesce', 'Mollusks, octopus, common, raw', [['porzione', 200]]],
  ['cozze', 'Cozze (sgusciate)', 'pesce', 'Mollusks, mussel, blue, raw', [['porzione', 100]]],
  ['vongole', 'Vongole (sgusciate)', 'pesce', 'Mollusks, clam, mixed species, raw', [['porzione', 100]]],

  // Uova
  ['uovo', 'Uovo intero', 'uova', 'Egg, whole, raw, fresh', [['uovo', 55]]],
  ['uovo-sodo', 'Uovo sodo', 'uova', 'Egg, whole, cooked, hard-boiled', [['uovo', 50]]],
  ['albume', "Albume d'uovo", 'uova', 'Egg, white, raw, fresh', [['albume', 33]]],
  ['tuorlo', "Tuorlo d'uovo", 'uova', 'Egg, yolk, raw, fresh', [['tuorlo', 17]]],
  ['frittata', 'Frittata / uova strapazzate', 'uova', 'Egg, whole, cooked, scrambled', [['porzione', 120]]],

  // Latte e yogurt
  ['latte-intero', 'Latte intero', 'latticini', 'Milk, whole, 3.25% milkfat, with added vitamin D', [['tazza', 200], ['bicchiere', 250]], 'ml'],
  ['latte-ps', 'Latte parzialmente scremato', 'latticini', 'Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D', [['tazza', 200], ['bicchiere', 250]], 'ml'],
  ['latte-scremato', 'Latte scremato', 'latticini', 'Milk, nonfat, fluid, with added vitamin A and vitamin D (fat free or skim)', [['tazza', 200], ['bicchiere', 250]], 'ml'],
  ['yogurt-intero', 'Yogurt bianco intero', 'latticini', 'Yogurt, plain, whole milk', [['vasetto', 125]]],
  ['yogurt-magro', 'Yogurt bianco magro', 'latticini', 'Yogurt, plain, skim milk', [['vasetto', 125]]],
  ['yogurt-greco-0', 'Yogurt greco 0%', 'latticini', 'Yogurt, Greek, plain, nonfat', [['vasetto', 150]]],
  ['yogurt-greco-2', 'Yogurt greco 2%', 'latticini', 'Yogurt, Greek, plain, lowfat', [['vasetto', 150]]],
  ['yogurt-frutta', 'Yogurt alla frutta', 'latticini', 'Yogurt, fruit, low fat, 9 g protein/8 oz', [['vasetto', 125]]],
  ['kefir', 'Kefir', 'latticini', 'Kefir, lowfat, plain, LIFEWAY', [['bicchiere', 200]], 'ml'],

  // Formaggi
  ['mozzarella', 'Mozzarella', 'formaggi', 'Cheese, mozzarella, whole milk', [['mozzarella', 125]]],
  ['mozzarella-light', 'Mozzarella light', 'formaggi', 'Cheese, mozzarella, part skim milk', [['mozzarella', 125]]],
  ['parmigiano', 'Parmigiano / Grana', 'formaggi', 'Cheese, parmesan, hard', [['cucchiaio grattugiato', 5], ['scaglia', 10]]],
  ['pecorino', 'Pecorino', 'formaggi', 'Cheese, romano', [['cucchiaio grattugiato', 5]]],
  ['ricotta', 'Ricotta', 'formaggi', 'Cheese, ricotta, whole milk', [['confezione', 250]]],
  ['ricotta-light', 'Ricotta light', 'formaggi', 'Cheese, ricotta, part skim milk', [['confezione', 250]]],
  ['fiocchi-latte', 'Fiocchi di latte', 'formaggi', 'Cheese, cottage, lowfat, 2% milkfat', [['vasetto', 150]]],
  ['gorgonzola', 'Gorgonzola', 'formaggi', 'Cheese, blue', [['porzione', 50]]],
  ['provolone', 'Provolone', 'formaggi', 'Cheese, provolone', [['fetta', 20]]],
  ['emmental', 'Emmental', 'formaggi', 'Cheese, swiss', [['fetta', 20]]],
  ['feta', 'Feta', 'formaggi', 'Cheese, feta', [['porzione', 50]]],
  ['mascarpone', 'Mascarpone', 'formaggi', L(453, 4.8, 4, 47, 0, 4, 32, 0.1), [['cucchiaio', 20]]],
  ['spalmabile', 'Formaggio spalmabile', 'formaggi', 'Cheese, cream', [['cucchiaio', 20]]],
  ['spalmabile-light', 'Formaggio spalmabile light', 'formaggi', 'Cheese, cream, low fat', [['cucchiaio', 20]]],
  ['stracchino', 'Stracchino / crescenza', 'formaggi', L(280, 18.5, 0, 22.5, 0, 0, 15, 1.2), [['porzione', 50]]],

  // Verdura
  ['lattuga', 'Insalata (lattuga)', 'verdura', 'Lettuce, green leaf, raw', [['ciotola', 80]]],
  ['iceberg', 'Insalata iceberg', 'verdura', 'Lettuce, iceberg, raw', [['ciotola', 80]]],
  ['romana', 'Lattuga romana', 'verdura', 'Lettuce, cos or romaine, raw', [['ciotola', 80]]],
  ['rucola', 'Rucola', 'verdura', 'Arugula, raw', [['manciata', 20]]],
  ['spinaci', 'Spinaci (crudi)', 'verdura', 'Spinach, raw', [['ciotola', 60]]],
  ['spinaci-cotti', 'Spinaci (cotti)', 'verdura', 'Spinach, cooked, boiled, drained, without salt', [['porzione', 200]]],
  ['pomodori', 'Pomodori', 'verdura', 'Tomatoes, red, ripe, raw', [['pomodoro medio', 120]]],
  ['pomodorini', 'Pomodorini', 'verdura', 'Tomatoes, red, ripe, raw', [['pomodorino', 15]]],
  ['zucchine', 'Zucchine', 'verdura', 'Squash, summer, zucchini, raw', [['zucchina media', 200]]],
  ['melanzane', 'Melanzane', 'verdura', 'Eggplant, raw', [['porzione', 200]]],
  ['peperoni', 'Peperoni rossi o gialli', 'verdura', 'Peppers, sweet, red, raw', [['peperone', 170]]],
  ['peperoni-verdi', 'Peperoni verdi', 'verdura', 'Peppers, sweet, green, raw', [['peperone', 150]]],
  ['cipolla', 'Cipolla', 'verdura', 'Onions, raw', [['cipolla media', 110]]],
  ['aglio', 'Aglio', 'verdura', 'Garlic, raw', [['spicchio', 3]]],
  ['carote', 'Carote', 'verdura', 'Carrots, raw', [['carota media', 60]]],
  ['sedano', 'Sedano', 'verdura', 'Celery, raw', [['gambo', 40]]],
  ['finocchio', 'Finocchio', 'verdura', 'Fennel, bulb, raw', [['finocchio', 230]]],
  ['cetrioli', 'Cetrioli', 'verdura', 'Cucumber, with peel, raw', [['cetriolo', 200]]],
  ['broccoli', 'Broccoli', 'verdura', 'Broccoli, raw', [['porzione', 200]]],
  ['cavolfiore', 'Cavolfiore', 'verdura', 'Cauliflower, raw', [['porzione', 200]]],
  ['cavolo', 'Cavolo cappuccio', 'verdura', 'Cabbage, raw', [['porzione', 150]]],
  ['cavolini', 'Cavolini di Bruxelles', 'verdura', 'Brussels sprouts, raw', [['porzione', 150]]],
  ['cavolo-nero', 'Cavolo nero / kale', 'verdura', 'Kale, raw', [['porzione', 100]]],
  ['carciofi', 'Carciofi', 'verdura', 'Artichokes, (globe or french), raw', [['carciofo', 120]]],
  ['asparagi', 'Asparagi', 'verdura', 'Asparagus, raw', [['porzione', 150]]],
  ['fagiolini', 'Fagiolini', 'verdura', 'Beans, snap, green, raw', [['porzione', 150]]],
  ['funghi', 'Funghi champignon', 'verdura', 'Mushrooms, white, raw', [['porzione', 150]]],
  ['mais', 'Mais dolce', 'verdura', 'Corn, sweet, yellow, raw', [['scatoletta', 140]]],
  ['zucca', 'Zucca', 'verdura', 'Pumpkin, raw', [['porzione', 200]]],
  ['radicchio', 'Radicchio', 'verdura', 'Radicchio, raw', [['porzione', 80]]],
  ['bietole', 'Bietole / erbette', 'verdura', 'Chard, swiss, raw', [['porzione', 200]]],
  ['barbabietola', 'Barbabietola (cotta)', 'verdura', 'Beets, cooked, boiled, drained', [['barbabietola', 80]]],
  ['porri', 'Porri', 'verdura', 'Leeks, (bulb and lower leaf-portion), raw', [['porro', 90]]],
  ['olive', 'Olive', 'verdura', 'Olives, pickled, canned or bottled, green', [['oliva', 4]]],
  ['passata', 'Passata di pomodoro', 'verdura', 'Tomato products, canned, puree, without salt added', [['porzione', 100]]],
  ['pelati', 'Pomodori pelati', 'verdura', 'Tomatoes, red, ripe, canned, packed in tomato juice', [['scatola', 400]]],
  ['concentrato', 'Concentrato di pomodoro', 'verdura', 'Tomato products, canned, paste, without salt added', [['cucchiaio', 15]]],

  // Frutta
  ['mela', 'Mela', 'frutta', 'Apples, raw, with skin', [['mela media', 180]]],
  ['pera', 'Pera', 'frutta', 'Pears, raw', [['pera media', 180]]],
  ['banana', 'Banana', 'frutta', 'Bananas, raw', [['banana media', 120]]],
  ['arancia', 'Arancia', 'frutta', 'Oranges, raw', [['arancia media', 150]]],
  ['mandarino', 'Mandarino / clementina', 'frutta', 'Tangerines, (mandarin oranges), raw', [['frutto', 75]]],
  ['limone', 'Limone (succo e polpa)', 'frutta', 'Lemons, raw, without peel', [['limone', 60]]],
  ['kiwi', 'Kiwi', 'frutta', 'Kiwifruit, green, raw', [['kiwi', 75]]],
  ['fragole', 'Fragole', 'frutta', 'Strawberries, raw', [['ciotola', 150]]],
  ['mirtilli', 'Mirtilli', 'frutta', 'Blueberries, raw', [['ciotola', 125]]],
  ['lamponi', 'Lamponi', 'frutta', 'Raspberries, raw', [['ciotola', 125]]],
  ['uva', 'Uva', 'frutta', 'Grapes, american type (slip skin), raw', [['grappolo', 150]]],
  ['pesca', 'Pesca', 'frutta', 'Peaches, yellow, raw', [['pesca media', 150]]],
  ['albicocca', 'Albicocca', 'frutta', 'Apricots, raw', [['albicocca', 35]]],
  ['prugna', 'Prugna / susina', 'frutta', 'Plums, raw', [['prugna', 65]]],
  ['ciliegie', 'Ciliegie', 'frutta', 'Cherries, sweet, raw', [['ciotola', 150]]],
  ['anguria', 'Anguria', 'frutta', 'Watermelon, raw', [['fetta', 300]]],
  ['melone', 'Melone', 'frutta', 'Melons, cantaloupe, raw', [['fetta', 200]]],
  ['ananas', 'Ananas', 'frutta', 'Pineapple, raw', [['fetta', 100]]],
  ['mango', 'Mango', 'frutta', 'Mangos, raw', [['mango', 200]]],
  ['avocado', 'Avocado', 'frutta', 'Avocados, raw', [['mezzo avocado', 70]]],
  ['fichi', 'Fichi', 'frutta', 'Figs, raw', [['fico', 50]]],
  ['cachi', 'Cachi', 'frutta', 'Persimmons, japanese, raw', [['caco', 170]]],
  ['melagrana', 'Melagrana', 'frutta', 'Pomegranates, raw', [['melagrana', 280]]],
  ['datteri', 'Datteri', 'frutta', 'Dates, medjool', [['dattero', 24]]],
  ['uvetta', 'Uvetta', 'frutta', 'Raisins, dark, seedless', [['cucchiaio', 10]]],
  ['fichi-secchi', 'Fichi secchi', 'frutta', 'Figs, dried, uncooked', [['fico', 20]]],
  ['albicocche-secche', 'Albicocche secche', 'frutta', 'Apricots, dried, sulfured, uncooked', [['albicocca', 8]]],

  // Frutta secca e semi
  ['mandorle', 'Mandorle', 'frutta-secca', 'Nuts, almonds', [['manciata', 30], ['mandorla', 1.2]]],
  ['noci', 'Noci (sgusciate)', 'frutta-secca', 'Nuts, walnuts, english', [['manciata', 30], ['noce', 5]]],
  ['nocciole', 'Nocciole', 'frutta-secca', 'Nuts, hazelnuts or filberts', [['manciata', 30]]],
  ['pistacchi', 'Pistacchi (sgusciati)', 'frutta-secca', 'Nuts, pistachio nuts, dry roasted, with salt added', [['manciata', 30]]],
  ['anacardi', 'Anacardi', 'frutta-secca', 'Nuts, cashew nuts, raw', [['manciata', 30]]],
  ['arachidi', 'Arachidi tostate', 'frutta-secca', 'Peanuts, all types, dry-roasted, with salt', [['manciata', 30]]],
  ['burro-arachidi', 'Burro di arachidi', 'frutta-secca', 'Peanut butter, smooth style, without salt', [['cucchiaio', 15], ['cucchiaino', 5]]],
  ['pinoli', 'Pinoli', 'frutta-secca', 'Nuts, pine nuts, dried', [['cucchiaio', 10]]],
  ['chia', 'Semi di chia', 'frutta-secca', 'Seeds, chia seeds, dried', [['cucchiaio', 12]]],
  ['lino', 'Semi di lino', 'frutta-secca', 'Seeds, flaxseed', [['cucchiaio', 10]]],
  ['girasole', 'Semi di girasole', 'frutta-secca', 'Seeds, sunflower seed kernels, dried', [['cucchiaio', 10]]],
  ['semi-zucca', 'Semi di zucca', 'frutta-secca', 'Seeds, pumpkin and squash seed kernels, dried', [['cucchiaio', 10]]],
  ['sesamo', 'Semi di sesamo', 'frutta-secca', 'Seeds, sesame seeds, whole, dried', [['cucchiaio', 9]]],

  // Oli e grassi
  ['olio-evo', "Olio extravergine d'oliva", 'grassi', 'Oil, olive, salad or cooking', SPOON],
  ['olio-semi', 'Olio di semi', 'grassi', 'Oil, canola', SPOON],
  ['burro', 'Burro', 'grassi', 'Butter, without salt', [['noce', 10], ['cucchiaino', 5]]],
  ['panna-cucina', 'Panna da cucina', 'grassi', 'Cream, fluid, light (coffee cream or table cream)', [['cucchiaio', 15], ['confezione', 200]], 'ml'],
  ['panna-fresca', 'Panna fresca da montare', 'grassi', 'Cream, fluid, heavy whipping', [['cucchiaio', 15]], 'ml'],
  ['panna-spray', 'Panna montata spray', 'grassi', 'Cream, whipped, cream topping, pressurized', [['spruzzata', 10]]],

  // Salse e condimenti
  ['maionese', 'Maionese', 'condimenti', 'Salad dressing, mayonnaise', [['cucchiaio', 15]]],
  ['maionese-light', 'Maionese light', 'condimenti', 'Salad dressing, mayonnaise, light', [['cucchiaio', 15]]],
  ['ketchup', 'Ketchup', 'condimenti', 'Catsup', [['cucchiaio', 15]]],
  ['senape', 'Senape', 'condimenti', 'Mustard, prepared, yellow', [['cucchiaino', 5]]],
  ['aceto', 'Aceto di vino', 'condimenti', 'Vinegar, red wine', [['cucchiaio', 15]], 'ml'],
  ['balsamico', 'Aceto balsamico', 'condimenti', 'Vinegar, balsamic', [['cucchiaio', 15]], 'ml'],
  ['pesto', 'Pesto alla genovese', 'condimenti', 'Sauce, pesto, ready-to-serve, refrigerated', [['cucchiaio', 15], ['porzione', 40]]],
  ['sugo-pomodoro', 'Sugo al pomodoro pronto', 'condimenti', 'Sauce, pasta, spaghetti/marinara, ready-to-serve', [['porzione', 100]]],
  ['zucchero', 'Zucchero', 'dolci', 'Sugars, granulated', [['cucchiaino', 5], ['bustina', 4]]],
  ['miele', 'Miele', 'dolci', 'Honey', [['cucchiaino', 7], ['cucchiaio', 21]]],
  ['marmellata', 'Marmellata / confettura', 'dolci', 'Jams and preserves', [['cucchiaino', 10]]],
  ['marmellata-light', 'Confettura senza zuccheri aggiunti', 'dolci', 'Jams and preserves, no sugar (with sodium saccharin), any flavor', [['cucchiaino', 10]]],

  // Dolci e snack
  ['cioccolato-fondente', 'Cioccolato fondente 70-85%', 'dolci', 'Chocolate, dark, 70-85% cacao solids', [['quadratino', 5], ['tavoletta', 100]]],
  ['cioccolato-fondente-60', 'Cioccolato fondente 60%', 'dolci', 'Chocolate, dark, 60-69% cacao solids', [['quadratino', 5]]],
  ['cioccolato-latte', 'Cioccolato al latte', 'dolci', 'Candies, milk chocolate', [['quadratino', 5]]],
  ['crema-nocciole', 'Crema di nocciole e cacao', 'dolci', 'Chocolate-flavored hazelnut spread', [['cucchiaino', 15]]],
  ['cacao', 'Cacao amaro in polvere', 'dolci', 'Cocoa, dry powder, unsweetened', [['cucchiaino', 5]]],
  ['biscotti-frollini', 'Biscotti frollini', 'dolci', 'Cookies, butter', [['biscotto', 10]]],
  ['biscotti-secchi', 'Biscotti secchi', 'dolci', 'Cookies, Marie biscuit', [['biscotto', 7]]],
  ['cornetto', 'Cornetto / croissant', 'dolci', 'Croissants, butter', [['cornetto', 60]]],
  ['torta', 'Torta margherita / pan di Spagna', 'dolci', 'Cake, sponge', [['fetta', 60]]],
  ['crostata', 'Crostata / torta di mele', 'dolci', 'Pie, apple', [['fetta', 100]]],
  ['gelato', 'Gelato alla crema', 'dolci', 'Ice creams, vanilla', [['coppetta', 80], ['pallina', 50]]],
  ['tiramisu', 'Tiramisù', 'dolci', L(300, 6, 28, 18, 0.5, 20, 11, 0.1), [['porzione', 100]]],

  // Bevande
  ['acqua', 'Acqua', 'bevande', L(0, 0, 0, 0), [['bicchiere', 250], ['bottiglia', 500]], 'ml'],
  ['caffe', 'Caffè espresso', 'bevande', 'Beverages, coffee, brewed, espresso, restaurant-prepared', [['tazzina', 30]], 'ml'],
  ['caffe-americano', 'Caffè americano / filtro', 'bevande', 'Beverages, coffee, brewed, prepared with tap water', [['tazza', 200]], 'ml'],
  ['te', 'Tè (senza zucchero)', 'bevande', 'Beverages, tea, black, brewed, prepared with tap water', [['tazza', 200]], 'ml'],
  ['succo-arancia', "Spremuta / succo d'arancia", 'bevande', 'Orange juice, raw', [['bicchiere', 200]], 'ml'],
  ['succo-mela', 'Succo di mela', 'bevande', 'Apple juice, canned or bottled, unsweetened, without added ascorbic acid', [['bicchiere', 200]], 'ml'],
  ['cola', 'Cola', 'bevande', L(42, 0, 10.6, 0, 0, 10.6, 0, 0), [['lattina', 330], ['bicchiere', 200]], 'ml'],
  ['cola-zero', 'Cola zero', 'bevande', L(0.3, 0, 0, 0), [['lattina', 330]], 'ml'],
  ['birra', 'Birra', 'bevande', 'Alcoholic beverage, beer, all', [['lattina', 330], ['media', 400]], 'ml'],
  ['birra-light', 'Birra light', 'bevande', 'Alcoholic beverage, beer, light', [['lattina', 330]], 'ml'],
  ['vino-rosso', 'Vino rosso', 'bevande', 'Alcoholic beverage, wine, table, red', [['bicchiere', 125]], 'ml'],
  ['vino-bianco', 'Vino bianco', 'bevande', 'Alcoholic beverage, wine, table, white', [['bicchiere', 125]], 'ml'],
  ['prosecco', 'Prosecco / spumante', 'bevande', L(70, 0.1, 1.5, 0, 0, 1.2, 0, 0), [['flûte', 100]], 'ml'],
  ['superalcolici', 'Superalcolici (gin, rum, vodka…)', 'bevande', 'Alcoholic beverage, distilled, all (gin, rum, vodka', [['shot', 40]], 'ml'],
  ['latte-soia', 'Bevanda di soia', 'bevande', 'Soymilk, original and vanilla, unfortified', [['tazza', 200]], 'ml'],
  ['latte-mandorla', 'Bevanda di mandorla (senza zucchero)', 'bevande', 'Beverages, almond milk, unsweetened, shelf stable', [['tazza', 200]], 'ml'],
  ['latte-avena', "Bevanda d'avena", 'bevande', L(46, 0.6, 7.5, 1.4, 0.8, 4, 0.2, 0.1), [['tazza', 200]], 'ml'],
  ['brodo', 'Brodo', 'bevande', 'Soup, chicken broth, ready-to-serve', [['tazza', 250]], 'ml'],

  // Piatti pronti
  ['pizza', 'Pizza margherita', 'piatti', 'Pizza, cheese topping, regular crust, frozen, cooked', [['pizza intera', 330], ['trancio', 120]]],
  ['lasagne', 'Lasagne', 'piatti', 'Lasagna, cheese, frozen, prepared', [['porzione', 300]]],
  ['minestrone', 'Minestrone', 'piatti', 'Soup, minestrone, canned, chunky, ready-to-serve', [['piatto', 300]]],
  ['hamburger-panino', 'Hamburger (panino)', 'piatti', 'Fast foods, hamburger, single, regular patty, plain', [['panino', 110]]],
  ['risotto', 'Risotto alla parmigiana', 'piatti', L(160, 4.5, 24, 5, 0.5, 0.5, 2.8, 0.7), [['piatto', 300]]],
  ['sushi', 'Sushi (nigiri / maki)', 'piatti', L(150, 6, 27, 1.5, 0.6, 5, 0.3, 1), [['pezzo', 30]]],
  ['insalata-riso', 'Insalata di riso', 'piatti', L(170, 6, 24, 5.5, 1, 1.5, 1.2, 1), [['piatto', 300]]],

  // Integratori
  ['whey', 'Proteine whey (isolate)', 'integratori', 'Beverages, Whey protein powder isolate', [['misurino', 30]]],
  ['barretta-proteica', 'Barretta proteica', 'integratori', L(360, 33, 30, 12, 6, 3, 5, 0.5), [['barretta', 60]]],
];

const r1 = v => (v == null ? 0 : Math.round(v * 10) / 10);
const slugs = new Set();
const out = FOODS.map(([id, name, cat, src, portions, unit = 'g']) => {
  if (slugs.has(id)) throw new Error(`duplicate id ${id}`);
  slugs.add(id);
  let n;
  if (typeof src === 'string') {
    const x = usda.get(src);
    if (!x) throw new Error(`not found: ${src} (${id})`);
    n = {
      kcal: x.kcal_per_100g,
      p: x.protein_g,
      c: x.carbs_g,
      f: x.fat_g,
      fiber: x.fiber_g,
      sugar: x.sugar_g,
      sat: x.saturated_fat_g,
      salt: x.salt_g,
    };
  } else n = src;
  return [
    id,
    name,
    cat,
    unit,
    Math.round(n.kcal),
    r1(n.p),
    r1(n.c),
    r1(n.f),
    r1(n.fiber),
    r1(n.sugar),
    r1(n.sat),
    r1(n.salt),
    portions && portions.length ? portions : 0,
  ];
});

const file = path.join(__dirname, '..', 'src', 'nutrition', 'generic.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify({ v: 1, foods: out }) + '\n');
console.log(`${out.length} foods → ${path.relative(process.cwd(), file)}`);
