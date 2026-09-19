# Copy review for social workers — 2026-09-18 (updated 2026-09-19)

Every sentence a person can read on HotGap, in English and the Spanish draft, one row each. Mark the **Notes** column: *OK*, or write what it should say. Slots in braces (`{pay}`, `{state}`) are filled from the family's own numbers and stay as they are; plural forms are the `one`/`other` pairs. The three surfaces speak in three registers (`design/README.md`): the citizen page to the family in the second person, the caseworker page to a counselor, the map to a reporter.

Row counts and the source files: `app/src/i18n/en.json`, `app/src/i18n/es-US.json` (the site); `core/src/messages/*.json` (the sentences the calculation itself writes — coverage notes, validation, the road out of poverty). The Spanish is a machine draft awaiting a native speaker.

## The questions (the ScenarioBar and editor) — 126 strings

| key | English | Spanish (draft) | Notes |
|---|---|---|---|
| `editor.wordmark` | HotGap | HotGap |  |
| `editor.actions.change` | Change my answers | Cambiar mis respuestas |  |
| `editor.actions.print` | Print | Imprimir |  |
| `editor.actions.changeShort` | Change | Cambiar |  |
| `editor.summary.none` | Tell us about your home and we'll show you the answer. | Cuéntenos sobre su hogar y le mostramos la respuesta. |  |
| `editor.summary.edit` | Edit | Editar |  |
| `editor.summary.line` | {household} in {place}, paid {pay}. | {household} en {place}, gana {pay}. |  |
| `editor.summary.place.withCounty` | {county}, {state} | {county}, {state} |  |
| `editor.summary.place.stateOnly` | {state} | {state} |  |
| `editor.summary.household.alone` | {adults} | {adults} |  |
| `editor.summary.household.withKids` | {adults} with {kids} | {adults} con {kids} |  |
| `editor.summary.adults.one` | A parent | Una madre o un padre |  |
| `editor.summary.adults.two` | Two parents | Dos padres |  |
| `editor.summary.adults.oneAlone` | An adult | Una persona adulta |  |
| `editor.summary.adults.twoAlone` | A couple | Una pareja |  |
| `editor.summary.kids` | {n, plural, one {a {ages}-year-old} other {kids aged {ages}}} | {n, plural, one {un niño de {ages} años} other {niños de {ages} años}} |  |
| `editor.heading` | If your pay goes up, do you keep more? | Si su pago sube, ¿le queda más? |  |
| `editor.lead` | Four questions. We work out your help at every pay level and show you what happens. | Cuatro preguntas. Calculamos su ayuda en cada nivel de sueldo y le mostramos qué pasa. |  |
| `editor.privacy` | We don't save what you type. No sign up, no tracking. | No guardamos lo que escribe. Sin registro y sin rastreo. |  |
| `editor.place.legend` | Where you live | Dónde vive |  |
| `editor.place.zip` | Your ZIP code | Su código postal |  |
| `editor.place.zipHint` | Five digits — we use it to find your state and county. | Cinco dígitos: los usamos para encontrar su estado y su condado. |  |
| `editor.place.or` | Or pick your state | O elija su estado |  |
| `editor.place.statePlaceholder` | Choose a state | Elija un estado |  |
| `editor.place.inState` | That is in {state}. | Eso está en {state}. |  |
| `editor.household.legend` | Who lives with you | Quién vive con usted |  |
| `editor.household.adults` | Adults | Adultos |  |
| `editor.household.single` | Just me | Solo yo |  |
| `editor.household.married` | Me and my spouse | Mi pareja y yo |  |
| `editor.household.kids` | How many kids live with you? | ¿Cuántos niños viven con usted? |  |
| `editor.household.kidsHint` | Kids under 18, up to six. | Niños menores de 18 años, hasta seis. |  |
| `editor.household.kidAge` | How old is kid {n}? | ¿Cuántos años tiene el niño {n}? |  |
| `editor.pay.legend` | What you're paid | Lo que gana |  |
| `editor.pay.amount` | Your pay, before taxes | Su sueldo, antes de impuestos |  |
| `editor.pay.unit` | Per | Por |  |
| `editor.pay.units.hour` | hour | hora |  |
| `editor.pay.units.week` | week | semana |  |
| `editor.pay.units.month` | month | mes |  |
| `editor.pay.units.year` | year | año |  |
| `editor.pay.hours` | Hours you work a week | Horas que trabaja a la semana |  |
| `editor.pay.hoursHint` | Leave it blank if you're not sure and we'll assume 40. | Déjelo en blanco si no está seguro y suponemos 40. |  |
| `editor.costs.legend` | What you pay each month | Lo que paga cada mes |  |
| `editor.costs.rent` | Rent or house payment | Renta o pago de la casa |  |
| `editor.costs.childcare` | Child care | Cuidado de niños |  |
| `editor.costs.typical` | Typical in {where} is {amount} a month. Change it if yours is different. | Lo habitual en {where} son {amount} al mes. Cámbielo si el suyo es distinto. |  |
| `editor.costs.none` | Put 0 if you pay nothing. | Ponga 0 si no paga nada. |  |
| `editor.submit` | See my answer | Ver mi respuesta |  |
| `editor.close` | Close | Cerrar |  |
| `editor.chips.where` | Where | Dónde |  |
| `editor.chips.household` | Home | Hogar |  |
| `editor.chips.pay` | Pay | Pago |  |
| `editor.chips.rent` | Rent | Renta |  |
| `editor.chips.childcare` | Child care | Cuidado de niños |  |
| `editor.chips.age` | Your age | Su edad |  |
| `editor.chips.spouseAge` | Spouse's age | Edad de su pareja |  |
| `editor.chips.spousePay` | Spouse's pay | Pago de su pareja |  |
| `editor.chips.ssdi` | SSDI | SSDI |  |
| `editor.chips.childSupport` | Child support | Manutención de hijos |  |
| `editor.chips.unemployment` | Unemployment pay | Pago por desempleo |  |
| `editor.chips.savings` | Savings | Ahorros |  |
| `editor.chips.status` | Your status | Su estatus |  |
| `editor.chips.spouseStatus` | Spouse's status | Estatus de su pareja |  |
| `editor.chips.kidsDisabled` | Kids who have a disability | Niños con una discapacidad |  |
| `editor.chips.childcareSubsidy` | Child care help | Ayuda para el cuidado de niños |  |
| `editor.chips.headStart` | Head Start | Head Start |  |
| `editor.chips.housing` | Housing help | Ayuda para la vivienda |  |
| `editor.chips.energyAssistance` | Heating bill help | Ayuda con la calefacción |  |
| `editor.chips.heatInRent` | Heat is in my rent | La calefacción va en mi renta |  |
| `editor.chips.employerCoverage` | Health plan from a job | Plan de salud del trabajo |  |
| `editor.chips.selfEmployed` | Self-employed | Trabajo por cuenta propia |  |
| `editor.chips.disabled` | You live with a disability | Usted vive con una discapacidad |  |
| `editor.chips.spouseDisabled` | Spouse lives with a disability | Su pareja vive con una discapacidad |  |
| `editor.chips.snap` | Gets food help (SNAP) | Recibe ayuda para la comida (SNAP) |  |
| `editor.chips.tanf` | Gets cash help (TANF) | Recibe ayuda en efectivo (TANF) |  |
| `editor.chips.medicaid` | Gets Medicaid | Recibe Medicaid |  |
| `editor.chips.wic` | Gets WIC | Recibe WIC |  |
| `editor.chips.on` | on | sí |  |
| `editor.chips.off` | off | no |  |
| `editor.chips.yes` | yes | sí |  |
| `editor.chips.no` | no | no |  |
| `editor.chips.none` | none | nada |  |
| `editor.chips.aYear` | {amount} a year | {amount} al año |  |
| `editor.chips.aMonth` | {amount} a month | {amount} al mes |  |
| `editor.dialog.save` | Save | Guardar |  |
| `editor.dialog.cancel` | Cancel | Cancelar |  |
| `editor.dialog.age` | Age in years | Edad en años |  |
| `editor.dialog.monthly` | Dollars a month | Dólares al mes |  |
| `editor.dialog.yearly` | Dollars a year | Dólares al año |  |
| `editor.dialog.dollars` | Dollars | Dólares |  |
| `editor.dialog.choose` | Choose one | Elija una opción |  |
| `editor.dialog.years` | Years in the US | Años en EE. UU. |  |
| `editor.dialog.yearsHint` | Only if you are not a citizen. | Solo si no es ciudadano. |  |
| `editor.dialog.hasDisability` | Kid {n}, who is {age}, lives with a disability | El niño {n}, de {age} años, vive con una discapacidad |  |
| `editor.status.citizen` | US citizen | Ciudadano de EE. UU. |  |
| `editor.status.lpr` | Has a green card (permanent resident) | Tiene green card (residente permanente) |  |
| `editor.status.refugee` | Refugee | Refugiado |  |
| `editor.status.asylee` | Asylee | Asilado |  |
| `editor.status.deportation_withheld` | Deportation withheld | Deportación suspendida |  |
| `editor.status.cuban_haitian_entrant` | Cuban or Haitian entrant | Entrante cubano o haitiano |  |
| `editor.status.conditional_entrant` | Conditional entrant | Entrante condicional |  |
| `editor.status.paroled_one_year` | Paroled for a year or more | Con permiso de permanencia (parole) de un año o más |  |
| `editor.status.daca` | DACA | DACA |  |
| `editor.status.tps` | TPS | TPS |  |
| `editor.status.undocumented` | No papers | Sin papeles |  |
| `editor.errors.checkThis` | Check this. | Revise esto. |  |
| `editor.errors.check` | Please check {label}. | Por favor revise {label}. |  |
| `editor.errors.fields.zip` | your ZIP code | su código postal |  |
| `editor.errors.fields.state` | your ZIP code or state | su código postal o estado |  |
| `editor.errors.fields.annualEarnings` | your pay | su pago |  |
| `editor.errors.fields.hoursPerWeek` | your hours | sus horas |  |
| `editor.errors.fields.childAges` | your kids' ages | las edades de sus niños |  |
| `editor.errors.fields.age` | your age | su edad |  |
| `editor.errors.fields.spouseAge` | your spouse's age | la edad de su pareja |  |
| `editor.errors.fields.monthlyRent` | your rent | su renta |  |
| `editor.errors.fields.monthlyChildcare` | your child care cost | lo que paga por el cuidado de niños |  |
| `editor.errors.fields.spouseAnnualEarnings` | your spouse's pay | el pago de su pareja |  |
| `editor.errors.fields.ssdiMonthly` | SSDI | el SSDI |  |
| `editor.errors.fields.childSupportMonthly` | child support | la manutención de hijos |  |
| `editor.errors.fields.unemploymentMonthly` | unemployment pay | el pago por desempleo |  |
| `editor.errors.fields.savings` | savings | los ahorros |  |
| `editor.errors.fields.youStatus` | your status | su estatus |  |
| `editor.errors.fields.spouseStatus` | your spouse's status | el estatus de su pareja |  |
| `editor.errors.fields.youYearsInUs` | years in the US | los años en EE. UU. |  |
| `editor.errors.fields.spouseYearsInUs` | your spouse's years in the US | los años de su pareja en EE. UU. |  |
| `editor.errors.fields.childDisabled` | which kids have a disability | qué niños tienen una discapacidad |  |
| `editor.errors.fields.countyFips` | your county | su condado |  |

## Citizen page — 264 strings

| key | English | Spanish (draft) | Notes |
|---|---|---|---|
| `citizen.loading` | Working it out — we check your help at {count} different pay levels, so give it a few seconds. | Estamos calculando: revisamos su ayuda en {count} niveles de sueldo distintos, así que deme unos segundos. |  |
| `citizen.errorTitle` | We couldn't work out your answer. | No pudimos calcular su respuesta. |  |
| `citizen.errors.rate_limited` | That's a few tries in a row. Give it a minute and try again. | Son varios intentos seguidos. Espere un minuto y vuelva a intentarlo. |  |
| `citizen.errors.busy` | The service is busy right now. Try again in a few seconds. | El servicio está ocupado en este momento. Inténtelo de nuevo en unos segundos. |  |
| `citizen.errors.other` | The service didn't answer, and nothing you typed was saved. Try again in a minute. | El servicio no respondió y no se guardó nada de lo que escribió. Inténtelo de nuevo en un minuto. |  |
| `citizen.tryAgain` | Try again | Intentar de nuevo |  |
| `citizen.skip` | Skip to the answer | Ir a la respuesta |  |
| `citizen.wordmark` | HotGap | HotGap |  |
| `citizen.heading` | If your pay goes up, do you keep more? | Si su pago sube, ¿le queda más? |  |
| `citizen.who` | {adults} with {kids}, in {place}. | {adults} con {kids}, en {place}. |  |
| `citizen.whoNoKids` | {adults} with no kids, in {place}. | {adults} sin niños, en {place}. |  |
| `citizen.adults.one` | A parent | Una madre o un padre |  |
| `citizen.adults.two` | Two parents | Dos padres |  |
| `citizen.adults.oneNoKids` | An adult | Un adulto |  |
| `citizen.adults.twoNoKids` | A couple | Una pareja |  |
| `citizen.kidsOne` | one kid, age {age} | un niño de {age} años |  |
| `citizen.kidsMany` | {n} kids, ages {ages} | {n} niños de {ages} años |  |
| `citizen.stillArchetype` | We still couldn't get your own numbers, so these are for a family like yours in your state. | Todavía no pudimos obtener sus propios números, así que estos son de una familia como la suya en su estado. |  |
| `citizen.verdict.always_up` | Every raise leaves you better off — we checked every step up to {top} and nothing drops. | Con cada aumento sale ganando: revisamos cada escalón hasta {top} y no baja en ningún punto. |  |
| `citizen.verdict.cliff_ahead` | You're fine up to {wage}; past that, earning more costs you about {drop} a year. | Va bien hasta {wage}; pasado ese punto, ganar más le cuesta unos {drop} al año. |  |
| `citizen.verdict.in_danger_zone` | More pay won't leave you better off until you're past {exit} — {leap} more than you make now. | Ganar más no mejora su situación hasta pasar {exit}, o sea {leap} más de lo que gana ahora. |  |
| `citizen.verdict.in_danger_zone:stuck` | More pay won't leave you better off anywhere we looked, right up to {top}. | Ganar más no mejora su situación en ningún punto que revisamos, hasta {top}. |  |
| `citizen.verdict.cliff_behind` | The worst of it is behind you — from {wage} up, more pay means more money. | Lo peor ya quedó atrás: de {wage} en adelante, más sueldo es más dinero. |  |
| `citizen.verdict.cliff_ahead:waits` | You're fine up to {wage}; past that you'd lose about {drop} a year, though not right away. | Va bien hasta {wage}; pasado ese punto perdería unos {drop} al año, aunque no de inmediato. |  |
| `citizen.again` | It happens again between {from} and {to}. | Vuelve a pasar entre {from} y {to}. |  |
| `citizen.againMany` | It happens {n} more times, between {from} and {to}. | Pasa {n} veces más, entre {from} y {to}. |  |
| `citizen.sub.more` | The line is more than your pay because help and tax credits count towards it. | La línea es más que su sueldo porque la ayuda y los descuentos en los impuestos cuentan dentro de ella. |  |
| `citizen.sub.less` | The line is less than your pay because taxes and health costs come out of it. | La línea es menos que su sueldo porque de ahí salen los impuestos y los costos de salud. |  |
| `citizen.noncash.childcare` | {amount} of it is child care help, which goes to your day care and not to you. | {amount} de eso es ayuda para el cuidado de niños, que va a su guardería y no a usted. |  |
| `citizen.noncash.schoolmeals` | {amount} of it is free school meals, not cash. | {amount} de eso son comidas escolares gratuitas, no dinero en efectivo. |  |
| `citizen.noncash.headstart` | {amount} of it is free early learning, not cash. | {amount} de eso es educación temprana gratuita, no dinero en efectivo. |  |
| `citizen.noncash.liheap` | {amount} of it is help with heating bills, which goes to your utility and not to you. | {amount} de eso es ayuda con la calefacción, que va a su compañía de servicios y no a usted. |  |
| `citizen.health` | And {amount} a year comes off the top for your health plan. | Y {amount} al año salen primero para su plan de salud. |  |
| `citizen.chart.title` | The line is what you keep in a year, as your pay goes up. | La línea es lo que le queda en un año, a medida que sube su sueldo. |  |
| `citizen.chart.unit.year` | The pay along the bottom is by the year. | El sueldo de abajo es por año. |  |
| `citizen.chart.unit.month` | The pay along the bottom is by the month. | El sueldo de abajo es por mes. |  |
| `citizen.chart.unit.week` | The pay along the bottom is by the week. | El sueldo de abajo es por semana. |  |
| `citizen.chart.unit.hour` | The pay along the bottom is by the hour, at {hours} hours a week. | El sueldo de abajo es por hora, a {hours} horas a la semana. |  |
| `citizen.chart.readoutHint` | Move along the line for any pay. | Deslice el dedo por la línea para ver cualquier sueldo. |  |
| `citizen.chart.readoutMarks` |  Press ] and [ to jump between drops. |  Pulse ] y [ para saltar entre caídas. |  |
| `citizen.chart.readout` | Paid {pay}, you keep {kept}. | Con un pago de {pay}, le quedan {kept}. |  |
| `citizen.chart.inYourZone` |  That is inside your flat stretch. |  Ese sueldo está dentro de su tramo plano. |  |
| `citizen.chart.inZone` |  That is inside a flat stretch. |  Ese sueldo está dentro de un tramo plano. |  |
| `citizen.chart.outZone` |  Here, more pay means more money. |  Aquí, más sueldo es más dinero. |  |
| `citizen.chart.markWould` | A drop near {pay}. Past it you'd keep about {drop} less a year. | Una caída cerca de {pay}. Pasado ese punto le quedarían unos {drop} menos al año. |  |
| `citizen.chart.markPast` | A drop near {pay}. You keep about {drop} less a year past it. | Una caída cerca de {pay}. Pasado ese punto le quedan unos {drop} menos al año. |  |
| `citizen.chart.markLater` | A drop near {pay}. You'd keep about {drop} less a year — but not that day. | Una caída cerca de {pay}. Le quedarían unos {drop} menos al año, pero no ese mismo día. |  |
| `citizen.chart.markMerged` | {n} drops between {from} and {to}, about {sum} a year together. | {n} caídas entre {from} y {to}, unos {sum} al año en total. |  |
| `citizen.chart.markMergedWaits` | {n} drops between {from} and {to}, about {sum} a year together. Some of it waits for a later day. | {n} caídas entre {from} y {to}, unos {sum} al año en total. Parte de eso espera a otro día. |  |
| `citizen.chart.axisNote` | The numbers up the side start at {floor}, not $0, so the drops are easy to see. | Los números del lado empiezan en {floor}, no en $0, para que las caídas se vean bien. |  |
| `citizen.chart.axisNoteBare` | The numbers up the side start at {floor}, not $0. | Los números del lado empiezan en {floor}, no en $0. |  |
| `citizen.chart.safeBeyond` |  From {safe} up, more pay always adds to what you keep. |  Desde {safe} en adelante, más sueldo siempre suma a lo que le queda. |  |
| `citizen.chart.safeNever` |  We checked as far as {top} and never found a point past all the flat stretches. |  Revisamos hasta {top} y nunca encontramos un punto más allá de todos los tramos planos. |  |
| `citizen.chart.estimates` |  These are estimates, on the {year} rules in {state}. |  Son estimaciones, con las reglas de {year} en {state}. |  |
| `citizen.chart.aria` | A line of the money this household keeps as pay rises from {from} to {to}. It is flat from {zoneFrom} to {zoneTo}.{more}{worst} The household sits at {pay}, inside a flat stretch. | Una línea del dinero que le queda a este hogar a medida que el pago sube de {from} a {to}. Es plana de {zoneFrom} a {zoneTo}.{more}{worst} El hogar está en {pay}, dentro de un tramo plano. |  |
| `citizen.chart.ariaMore` |  It is flat again from {from} to {to}. |  Vuelve a ser plana de {from} a {to}. |  |
| `citizen.chart.ariaWorst` |  The biggest drop is at {at}, where {what} ends. |  La caída más grande está en {at}, donde se termina {what}. |  |
| `citizen.chart.ariaNoZone` | A line of the money this household keeps as pay rises from {from} to {to}.{worst} The household sits at {pay}. | Una línea del dinero que le queda a este hogar a medida que el pago sube de {from} a {to}.{worst} El hogar está en {pay}. |  |
| `citizen.chart.someHelp` | some help | parte de la ayuda |  |
| `citizen.chart.labels.later` | later | más adelante |  |
| `citizen.chart.labels.backToEven` | back to even | de vuelta a la par |  |
| `citizen.chart.labels.backToEvenSafe` | back to even, and safe from here | de vuelta a la par, y seguro de aquí en adelante |  |
| `citizen.chart.labels.safe` | safe from here | seguro de aquí en adelante |  |
| `citizen.chart.labels.leap` | +{leap} | +{leap} |  |
| `citizen.chart.labels.leapMore` | more than +{leap} | más de +{leap} |  |
| `citizen.chart.labels.drop` | −{drop} | −{drop} |  |
| `citizen.chart.labels.ends` | {phrase} ends | termina {phrase} |  |
| `citizen.chart.labels.road.keeps` | you keep {cents}¢ of each extra dollar | se queda con {cents}¢ de cada dólar extra |  |
| `citizen.chart.labels.road.loses` | you lose {cents}¢ of each extra dollar | pierde {cents}¢ de cada dólar extra |  |
| `citizen.chart.labels.youKeepHelp` | you keep {kept}, help counted | le quedan {kept}, con la ayuda |  |
| `citizen.chart.labels.youKeepTax` | you keep {kept} after tax | le quedan {kept} tras los impuestos |  |
| `citizen.chart.scrolls` | The picture covers every pay from {from} to {to} — slide it sideways to see the rest. | La imagen cubre todos los sueldos de {from} a {to}: deslícela de lado para ver el resto. |  |
| `citizen.chart.wholeOnPaper` | The picture covers every pay from {from} to {to}. | La imagen cubre todos los sueldos de {from} a {to}. |  |
| `citizen.chart.rangeFrom` | ← {from} | ← {from} |  |
| `citizen.chart.rangeTo` | {to} → | {to} → |  |
| `citizen.chart.howTo` | How to read this picture | Cómo leer esta imagen |  |
| `citizen.chart.rangeMid` | swipe to see more | deslice para ver más |  |
| `citizen.key.line` | Money you keep | El dinero que le queda |  |
| `citizen.key.band` | Your flat stretch | Su tramo plano |  |
| `citizen.key.other` | Other flat stretches | Otros tramos planos |  |
| `citizen.key.drop` | A drop this year | Una caída este año |  |
| `citizen.key.later` | A drop that waits | Una caída que espera |  |
| `citizen.key.you` | You now | Usted ahora |  |
| `citizen.key.boundary` | Where heating help stops | Dónde termina la ayuda con la calefacción |  |
| `citizen.key.road` | The road out of poverty | El camino para salir de la pobreza |  |
| `citizen.boundary.line` | Above {pay} you can't apply for help with heating bills in {state} any more. It's called LIHEAP. | Por encima de {pay} ya no puede pedir ayuda con la factura de la calefacción en {state}. Se llama LIHEAP. |  |
| `citizen.boundary.worth` |  It's worth {min} to {max} a winter if you get it. |  Vale de {min} a {max} por invierno si la recibe. |  |
| `citizen.boundary.worthFlat` |  It's worth {amount} a winter if you get it. |  Vale {amount} por invierno si la recibe. |  |
| `citizen.boundary.worthUnknown` |  We couldn't read what it pays. |  No pudimos leer cuánto paga. |  |
| `citizen.boundary.served.some` |  About {n} in 10 families here who could get it do. |  De las familias de aquí que podrían recibirla, unas {n} de cada 10 la reciben. |  |
| `citizen.boundary.served.few` |  Fewer than 1 in 10 families here who could get it do. |  De las familias de aquí que podrían recibirla, menos de 1 de cada 10 la recibe. |  |
| `citizen.boundary.served.most` |  Almost all the families here who could get it do. |  Casi todas las familias de aquí que podrían recibirla la reciben. |  |
| `citizen.boundary.served.unknown` |  We don't know how many families here who could get it do. |  No sabemos cuántas familias de aquí que podrían recibirla la reciben. |  |
| `citizen.boundary.invite` | If you get it, turn it on and we'll put it in your line. | Si la recibe, actívela y la ponemos en su línea. |  |
| `citizen.boundary.credit` | Help with heating bills in {state} is a tax credit, so it's already in your line. It shrinks as you earn more and runs out above {pay}. | La ayuda con la calefacción en {state} es un descuento en los impuestos, así que ya está en su línea. Se achica a medida que gana más y se acaba por encima de {pay}. |  |
| `citizen.boundary.counted` | You told us you get help with heating bills (LIHEAP), so it's in your line: about {amount} a year, up to {pay}. | Usted nos dijo que recibe ayuda con la factura de la calefacción (LIHEAP), así que está en su línea: unos {amount} al año, hasta {pay}. |  |
| `citizen.source.archetype` | We couldn't get your own numbers right now, so these are for a family like yours in your state. | No pudimos obtener sus propios números ahora mismo, así que estos son de una familia como la suya en su estado. |  |
| `citizen.source.clamped` |  Your pay is above the range we checked, so these numbers are for {top}, the top of it. |  Su sueldo está por encima del rango que revisamos, así que estos números son para {top}, el tope de ese rango. |  |
| `citizen.source.live` | Source: HotGap, from PolicyEngine with {year} rules. These are your own numbers. | Fuente: HotGap, con PolicyEngine y las reglas de {year}. Estos son sus propios números. |  |
| `citizen.source.sweep` | Source: HotGap, from {model} with {year} rules. Sweep of {date}. | Fuente: HotGap, con {model} y las reglas de {year}. Barrido del {date}. |  |
| `citizen.source.sweepBare` | Source: HotGap, from PolicyEngine. Rules for {year}. | Fuente: HotGap, con PolicyEngine. Reglas de {year}. |  |
| `citizen.source.rent` |  Rent: HUD Fair Market Rents, {rent}. |  Renta: rentas justas de mercado de HUD, {rent}. |  |
| `citizen.source.childcare` |  Child care price: {childcare}, grown to {year} dollars. |  Precio del cuidado de niños: {childcare}, llevado a dólares de {year}. |  |
| `citizen.source.money` |  Money kept is what's left after taxes and health-plan premiums. |  El dinero que le queda es lo que sobra después de los impuestos y de las primas del plan de salud. |  |
| `citizen.source.heading` | Where these numbers come from | De dónde salen estos números |  |
| `citizen.table.show` | Show the numbers | Ver los números |  |
| `citizen.table.caption` | The points the picture marks. Money kept is in dollars a year. | Los puntos que marca el dibujo. El dinero que le queda está en dólares al año. |  |
| `citizen.table.pay` | Your pay | Su pago |  |
| `citizen.table.keep` | You keep | Le quedan |  |
| `citizen.table.drop` | Drop | Caída |  |
| `citizen.table.dropCell` | −{drop} | −{drop} |  |
| `citizen.table.mark` | On the picture | En el dibujo |  |
| `citizen.table.marks.peak` | The top of your flat stretch | El tope de su tramo plano |  |
| `citizen.table.marks.you` | You now | Usted ahora |  |
| `citizen.table.marks.exit` | Back to even | De vuelta a la par |  |
| `citizen.table.marks.drop` | A drop | Una caída |  |
| `citizen.table.marks.later` | A drop that waits | Una caída que espera |  |
| `citizen.table.marks.safe` | Safe from here | Seguro de aquí en adelante |  |
| `citizen.steps.heading` | What happens at each step | Qué pasa en cada escalón |  |
| `citizen.steps.none` | Nothing stops anywhere in the range we checked. | No se termina nada en el rango de sueldos que revisamos. |  |
| `citizen.steps.ends` | {Phrase} ends — it's called {name}. | {Phrase} se termina: se llama {name}. |  |
| `citizen.steps.wouldEnd` | {Phrase} would end — it's called {name}. | {Phrase} se terminaría: se llama {name}. |  |
| `citizen.steps.endsGroup.adults` | Your own {noun} ends — it's called {name}. | Se termina {noun} para usted: se llama {name}. |  |
| `citizen.steps.endsGroup.children` | Your kids' {noun} ends — it's called {name}. | Se termina {noun} de sus niños: se llama {name}. |  |
| `citizen.steps.wouldEndGroup.adults` | Your own {noun} would end — it's called {name}. | Se terminaría {noun} para usted: se llama {name}. |  |
| `citizen.steps.wouldEndGroup.children` | Your kids' {noun} would end — it's called {name}. | Se terminaría {noun} de sus niños: se llama {name}. |  |
| `citizen.steps.starts` |  Then {phrase} starts — it's called {name}. |  Entonces empieza {phrase}: se llama {name}. |  |
| `citizen.steps.wouldStart` |  Then {phrase} would start — it's called {name}. |  Entonces empezaría {phrase}: se llama {name}. |  |
| `citizen.steps.remains` |  Some of it carries on to {until}: {list}. |  Parte de eso sigue hasta {until}: {list}. |  |
| `citizen.steps.remainsItem` | {amount} of {phrase} | {amount} de {phrase} |  |
| `citizen.steps.smaller.benefits` | Some help gets smaller here. | Aquí parte de la ayuda se achica. |  |
| `citizen.steps.smaller.credits` | Your tax credits get smaller here. | Aquí sus descuentos en los impuestos se achican. |  |
| `citizen.steps.smaller.premiums` | Your health plan costs more here. | Aquí su plan de salud cuesta más. |  |
| `citizen.steps.smaller.other` | Other money gets smaller here. | Aquí otro dinero se achica. |  |
| `citizen.steps.wouldSmaller.benefits` | Some help would get smaller here. | Aquí parte de la ayuda se achicaría. |  |
| `citizen.steps.wouldSmaller.credits` | Your tax credits would get smaller here. | Aquí sus descuentos en los impuestos se achicarían. |  |
| `citizen.steps.wouldSmaller.premiums` | Your health plan would cost more here. | Aquí su plan de salud costaría más. |  |
| `citizen.steps.wouldSmaller.other` | Other money would get smaller here. | Aquí otro dinero se achicaría. |  |
| `citizen.steps.loss` | You keep about {drop} less. | Le quedan unos {drop} menos. |  |
| `citizen.steps.wouldLoss` | You'd keep about {drop} less. | Le quedarían unos {drop} menos. |  |
| `citizen.steps.laterLoss` | Later, you would keep about {drop} less a year. | Más adelante, le quedarían unos {drop} menos al año. |  |
| `citizen.steps.biggest` |  This is the biggest drop. |  Esta es la caída más grande. |  |
| `citizen.steps.waitsBadge` | Waits | Espera |  |
| `citizen.steps.close` | Close | Cerrar |  |
| `citizen.steps.waits.head_start_program_year` |  It doesn't end that day: a child already in it stays to the end of the next program year. |  No se acaba ese día: un niño o una niña que ya está en el programa se queda hasta el fin del próximo año escolar. |  |
| `citizen.steps.waits.child_continuous_eligibility` |  It doesn't end that day: your kids keep it until their next yearly check, up to 12 months later. |  No se acaba ese día: sus niños lo conservan hasta su próxima revisión anual, hasta 12 meses después. |  |
| `citizen.steps.waits.transitional_medical_assistance` |  It doesn't end that day: you keep it for another 6 to 12 months. |  No se acaba ese día: usted lo conserva de 6 a 12 meses más. |  |
| `citizen.steps.lead` | Each of these is a pay where something stops. People call them benefits cliffs. | Cada uno es un punto del sueldo en el que algo se termina. La gente los llama precipicios de beneficios. |  |
| `citizen.waits.thisHelp` | this help | esta ayuda |  |
| `citizen.waits.kids` | your kids' {noun} | {noun} de sus niños |  |
| `citizen.waits.own` | your own {noun} | {noun} para usted |  |
| `citizen.assumed.heading` | What we assumed | Lo que supusimos |  |
| `citizen.assumed.rent` | {amount} a month. You told us this. | {amount} al mes. Usted nos lo dijo. |  |
| `citizen.assumed.rentTypical` | {amount} a month — the usual rent in {state}. | {amount} al mes: la renta habitual en {state}. |  |
| `citizen.assumed.rentNone` | You didn't say, so we counted no rent. | No nos lo dijo, así que no contamos ninguna renta. |  |
| `citizen.assumed.childcare` | {amount} a month for {kids}. You told us this. | {amount} al mes por {kids}. Usted nos lo dijo. |  |
| `citizen.assumed.childcareTypical` | {amount} a month for {kids} — the usual price of day care in {state}. | {amount} al mes por {kids}: el precio habitual de la guardería en {state}. |  |
| `citizen.assumed.childcareNone` | Nobody in the home pays for day care. | Nadie en el hogar paga guardería. |  |
| `citizen.assumed.help` | {list}. We counted each one as if you get it. | {list}. Contamos cada una como si la recibiera. |  |
| `citizen.assumed.notCounted` | {list}. We counted these as if you don't get them. | {list}. Las contamos como si no las recibiera. |  |
| `citizen.assumed.you` | Age {age}, a U.S. citizen. | {age} años, ciudadano de EE. UU. |  |
| `citizen.assumed.youNotCitizen` | Age {age}, not a U.S. citizen. | {age} años, no es ciudadano de EE. UU. |  |
| `citizen.assumed.spouse` | Age {age}, paid {pay} a year. | {age} años, le pagan {pay} al año. |  |
| `citizen.assumed.spouseNoPay` | Age {age}, not paid. | {age} años, sin pago. |  |
| `citizen.assumed.nobodyDisabled` |  Nobody in the home has a disability. |  Nadie en el hogar tiene una discapacidad. |  |
| `citizen.assumed.youDisabled` |  You told us you have a disability. |  Usted nos dijo que tiene una discapacidad. |  |
| `citizen.assumed.spouseDisabled` |  You told us your spouse has a disability. |  Usted nos dijo que su pareja tiene una discapacidad. |  |
| `citizen.assumed.kidDisabled` |  You told us one of your kids has a disability. |  Usted nos dijo que uno de sus niños tiene una discapacidad. |  |
| `citizen.assumed.kidsDisabled` |  You told us {n} of your kids have a disability. |  Usted nos dijo que {n} de sus niños tienen una discapacidad. |  |
| `citizen.assumed.savings` | Savings: {savings}. | Ahorros: {savings}. |  |
| `citizen.assumed.noOtherMoney` |  No child support, SSDI or unemployment pay. |  Sin manutención de hijos, SSDI ni pago por desempleo. |  |
| `citizen.assumed.hours` | {hours} hours a week. | {hours} horas a la semana. |  |
| `citizen.assumed.hoursNone` | You didn't say, so we assumed full time. | No nos lo dijo, así que supusimos tiempo completo. |  |
| `citizen.assumed.selfEmployed` | You work for yourself, not for a boss. | Usted trabaja por cuenta propia, no para un jefe. |  |
| `citizen.assumed.employerPlan` | {amount} a year comes out of your pay for it. | {amount} al año salen de su pago para pagarlo. |  |
| `citizen.assumed.employerPlanFree` | At your pay we counted no cost for it. | Con su sueldo no contamos ningún costo por él. |  |
| `citizen.assumed.headStart` | Worth {amount} a year to you — what the day care would otherwise cost. | Vale {amount} al año para usted: lo que costaría la guardería. |  |
| `citizen.assumed.coverageGap` | Between {from} and {to} you'd have no health plan at all: no Medicaid, and no help to buy one. We counted no health plan cost there. | Entre {from} y {to} no tendría ningún plan de salud: ni Medicaid ni ayuda para comprar uno. Ahí no contamos ningún costo de plan de salud. |  |
| `citizen.assumed.premiumHelp` | {program}. It helps pay for health insurance. We counted it. | {program}. Ayuda a pagar el seguro de salud. Lo contamos. |  |
| `citizen.assumed.premiumHelpMax` | {program}, up to {amount} a year. It helps pay for health insurance. We counted it. | {program}, hasta {amount} al año. Ayuda a pagar el seguro de salud. Lo contamos. |  |
| `citizen.assumed.maTafdc` | We used the state's rule for people already on it. Not the first-year rule. | Usamos la regla del estado para quienes ya la reciben. No la regla del primer año. |  |
| `citizen.assumed.unclaimed` | You told us you don't get {list}. At your pay it would be worth about {amount} a year. | Usted nos dijo que no recibe {list}. Con su sueldo valdría unos {amount} al año. |  |
| `citizen.assumed.labels.rent` | Rent | Renta |  |
| `citizen.assumed.labels.childcare` | Child care | Cuidado de niños |  |
| `citizen.assumed.labels.help` | Help you get | Ayuda que recibe |  |
| `citizen.assumed.labels.notCounted` | Not counted | No contada |  |
| `citizen.assumed.labels.you` | You | Usted |  |
| `citizen.assumed.labels.spouse` | Your spouse | Su pareja |  |
| `citizen.assumed.labels.money` | Other money | Otro dinero |  |
| `citizen.assumed.labels.hours` | Hours | Horas |  |
| `citizen.assumed.labels.work` | Work | Trabajo |  |
| `citizen.assumed.labels.employerPlan` | Health plan from a job | Plan de salud del trabajo |  |
| `citizen.assumed.labels.headStart` | Head Start | Head Start |  |
| `citizen.assumed.labels.coverageGap` | No health plan | Sin plan de salud |  |
| `citizen.assumed.labels.premiumHelp` | Health plan help | Ayuda con el plan de salud |  |
| `citizen.assumed.labels.maTafdc` | Cash help (TANF) | Ayuda en efectivo (TANF) |  |
| `citizen.assumed.labels.unclaimed` | Help you could get | Ayuda que podría recibir |  |
| `citizen.assumed.kids` | {n, plural, =1 {one kid} =2 {two kids} =3 {three kids} other {{n} kids}} | {n, plural, =1 {un niño} =2 {dos niños} =3 {tres niños} other {{n} niños}} |  |
| `citizen.assumed.monthly.ssdi` |  SSDI: {amount} a month. |  SSDI: {amount} al mes. |  |
| `citizen.assumed.monthly.childSupport` |  Child support: {amount} a month. |  Manutención de hijos: {amount} al mes. |  |
| `citizen.assumed.monthly.unemployment` |  Unemployment pay: {amount} a month. |  Pago por desempleo: {amount} al mes. |  |
| `citizen.assumed.none` | None | Ninguno |  |
| `citizen.assumed.lead` | Change any of these and the picture changes. If something here is wrong for you, the numbers are wrong too. | Cambie cualquiera de estos datos y la imagen cambia. Si algo de aquí no es correcto para usted, los números tampoco lo son. |  |
| `citizen.incomplete.lead` | One thing we couldn't count. | Una cosa que no pudimos contar. |  |
| `citizen.incomplete.body` |  {state} has {program}, and our maths doesn't include it, so a drop could be missing from this page. |  {state} tiene {program}, y nuestras cuentas no lo incluyen, así que podría faltar una caída en esta página. |  |
| `citizen.reach.heading` | How common is this pay? | ¿Qué tan común es este pago? |  |
| `citizen.reach.some` | About {n} in 10 {who} in {state} are paid {pay} or less. | Alrededor de {n} de cada 10 {who} en {state} ganan {pay} o menos. |  |
| `citizen.reach.few` | Fewer than 1 in 10 {who} in {state} are paid {pay} or less. | Menos de 1 de cada 10 {who} en {state} ganan {pay} o menos. |  |
| `citizen.reach.most` | Almost all {who} in {state} are paid {pay} or less. | Casi todos los {who} en {state} ganan {pay} o menos. |  |
| `citizen.reach.who.parents` | parents like you | padres como usted |  |
| `citizen.reach.who.couples` | couples like you | parejas como la suya |  |
| `citizen.reach.who.people` | people like you | personas como usted |  |
| `citizen.reach.margin` |  The count could be off by a few thousand dollars either way. |  La cuenta puede variar unos miles de dólares hacia arriba o hacia abajo. |  |
| `citizen.reach.note` | This says how common the pay is. It doesn't say what you'll earn. | Esto dice qué tan común es ese sueldo. No dice cuánto va a ganar usted. |  |
| `citizen.reach.source` | From U.S. Census Bureau survey data ({vintages}). Grown to {year} dollars. | De datos de encuestas de la Oficina del Censo de EE. UU. ({vintages}). Llevados a dólares de {year}. |  |
| `citizen.reach.sourceBare` | From U.S. Census Bureau survey data. | De datos de encuestas de la Oficina del Censo de EE. UU. |  |
| `citizen.reach.survey.one` | ACS {year}, {n}-year | ACS {year}, {n} año |  |
| `citizen.reach.survey.range` | ACS {from}–{to}, {n}-year | ACS {from}–{to}, {n} años |  |
| `citizen.hours.heading` | The lowest legal pay | El salario mínimo legal |  |
| `citizen.hours.body` | The lowest legal pay in {state} is {wage} an hour, and full-time work at that pay is about {fullTime} a year. | El salario mínimo en {state} es {wage} por hora, y trabajar tiempo completo con ese salario son unos {fullTime} al año. |  |
| `citizen.footer.estimates` | These are estimates. | Son estimaciones. |  |
| `citizen.footer.caseworker` |  A case worker decides what help you really get. |  Un trabajador social decide la ayuda que de verdad recibe. |  |
| `citizen.footer.assumed` | We use the {year} rules. We didn't ask about anyone in the home aged 65 or more. | Usamos las reglas de {year}. No preguntamos por nadie del hogar de 65 años o más. |  |
| `citizen.footer.noAdvice` | We don't tell you what to do. | No le decimos qué hacer. |  |
| `citizen.program.snap` | food help | la ayuda para la comida |  |
| `citizen.program.medicaid` | a free state health plan | un plan de salud gratuito del estado |  |
| `citizen.program.chip` | a health plan for kids | un plan de salud para niños |  |
| `citizen.program.eitc` | a tax break for workers | un descuento en los impuestos para trabajadores |  |
| `citizen.program.ctc` | the child tax break | el descuento en los impuestos por hijos |  |
| `citizen.program.aca` | help paying for health insurance | la ayuda para pagar el seguro de salud |  |
| `citizen.program.tanf` | cash help | la ayuda en efectivo |  |
| `citizen.program.housing` | housing help | la ayuda para la vivienda |  |
| `citizen.program.wic` | food help for moms and babies | la ayuda para la comida de mamás y bebés |  |
| `citizen.program.ssi` | SSI cash help | la ayuda en efectivo del SSI |  |
| `citizen.program.headstart` | free early learning | la educación temprana gratuita |  |
| `citizen.program.schoolmeals` | free school meals | las comidas escolares gratuitas |  |
| `citizen.program.childcare` | child care help | la ayuda para el cuidado de niños |  |
| `citizen.program.liheap` | help with heating bills | la ayuda con la factura de la calefacción |  |
| `citizen.called.eitc` | the Earned Income Tax Credit (EITC) | Crédito Tributario por Ingreso del Trabajo (EITC) |  |
| `citizen.called.ctc` | the Child Tax Credit | Crédito Tributario por Hijos |  |
| `citizen.called.aca` | the Premium tax credit | crédito fiscal para las primas |  |
| `citizen.called.housing` | the Housing voucher | vale de vivienda |  |
| `citizen.called.childcare` | the CCDF child care subsidy | subsidio de cuidado infantil CCDF |  |
| `citizen.called.liheap` | LIHEAP | LIHEAP |  |
| `citizen.noun.snap` | food help | la ayuda para la comida |  |
| `citizen.noun.medicaid` | free state health plan | el plan de salud gratuito del estado |  |
| `citizen.noun.chip` | health plan for kids | el plan de salud para niños |  |
| `citizen.noun.eitc` | tax break for workers | el descuento en los impuestos para trabajadores |  |
| `citizen.noun.ctc` | child tax break | el descuento en los impuestos por hijos |  |
| `citizen.noun.aca` | help paying for health insurance | la ayuda para pagar el seguro de salud |  |
| `citizen.noun.tanf` | cash help | la ayuda en efectivo |  |
| `citizen.noun.housing` | housing help | la ayuda para la vivienda |  |
| `citizen.noun.wic` | food help for moms and babies | la ayuda para la comida de mamás y bebés |  |
| `citizen.noun.ssi` | SSI cash help | la ayuda en efectivo del SSI |  |
| `citizen.noun.headstart` | free early learning | la educación temprana gratuita |  |
| `citizen.noun.schoolmeals` | free school meals | las comidas escolares gratuitas |  |
| `citizen.noun.childcare` | child care help | la ayuda para el cuidado de niños |  |
| `citizen.noun.liheap` | help with heating bills | la ayuda con la factura de la calefacción |  |
| `citizen.phraseAndName` | {phrase} ({name}) | {phrase} ({name}) |  |
| `citizen.pageTitle` | HotGap — will I lose money if I earn more? | HotGap — si gano más, ¿pierdo dinero? |  |
| `citizen.keepNext.base` | Of the next {over} you earn, you'd keep about {kept}. | De los próximos {over} que gane, le quedarían unos {kept}. |  |
| `citizen.keepNext.cliff` | Of the next {over} you earn, you'd keep about {kept}, because {phrase} ends at {wage}. | De los próximos {over} que gane, le quedarían unos {kept}, porque {phrase} se termina en {wage}. |  |
| `citizen.keepNext.plateau` | Of the next {over} you earn, you'd keep about {kept} — that's a flat stretch: more pay, barely more money. | De los próximos {over} que gane, le quedarían unos {kept}: eso es un tramo plano, más sueldo y apenas más dinero. |  |
| `citizen.beyondReach` |  The ones past {at} are past what {n} in 10 families like yours earn. |  Los que están más allá de {at} superan lo que ganan {n} de cada 10 familias como la suya. |  |

## Caseworker page — 400 strings

| key | English | Spanish (draft) | Notes |
|---|---|---|---|
| `caseworker.editor.summary.none` | Enter the household to evaluate it. | Ingrese el hogar para evaluarlo. |  |
| `caseworker.editor.summary.edit` | Edit | Editar |  |
| `caseworker.editor.heading` | The household | El hogar |  |
| `caseworker.editor.lead` | Place, household, pay and monthly costs. Net income is evaluated at every pay level on the axis. | Lugar, hogar, pago y gastos mensuales. El ingreso neto se evalúa en cada nivel de pago del eje. |  |
| `caseworker.editor.privacy` | Nothing typed here is stored. | Nada de lo que se escribe aquí se guarda. |  |
| `caseworker.editor.place.legend` | Place | Lugar |  |
| `caseworker.editor.place.zip` | ZIP code | Código postal |  |
| `caseworker.editor.place.zipHint` | Five digits; it sets the state and the county. | Cinco dígitos; fija el estado y el condado. |  |
| `caseworker.editor.place.or` | Or the state | O el estado |  |
| `caseworker.editor.place.statePlaceholder` | Choose a state | Elija un estado |  |
| `caseworker.editor.place.inState` | In {state}. | En {state}. |  |
| `caseworker.editor.household.legend` | Household | Hogar |  |
| `caseworker.editor.household.adults` | Adults | Adultos |  |
| `caseworker.editor.household.single` | One adult | Un adulto |  |
| `caseworker.editor.household.married` | Two adults, married | Dos adultos, casados |  |
| `caseworker.editor.household.kids` | Children in the household | Niños en el hogar |  |
| `caseworker.editor.household.kidsHint` | Under 18. Up to six. | Menores de 18. Hasta seis. |  |
| `caseworker.editor.household.kidAge` | Age of child {n} | Edad del niño {n} |  |
| `caseworker.editor.pay.legend` | Pay | Pago |  |
| `caseworker.editor.pay.amount` | Pay, before taxes | Pago, antes de impuestos |  |
| `caseworker.editor.pay.unit` | Per | Por |  |
| `caseworker.editor.pay.hours` | Hours a week | Horas a la semana |  |
| `caseworker.editor.pay.hoursHint` | Blank assumes 40. | En blanco supone 40. |  |
| `caseworker.editor.costs.legend` | Monthly costs | Gastos mensuales |  |
| `caseworker.editor.costs.rent` | Rent or mortgage | Renta o hipoteca |  |
| `caseworker.editor.costs.childcare` | Child care | Cuidado de niños |  |
| `caseworker.editor.costs.typical` | Typical in {where}: {amount} a month. Change it if the household's differs. | Lo típico en {where}: {amount} al mes. Cámbielo si el del hogar es distinto. |  |
| `caseworker.editor.costs.none` | 0 if nothing is paid. | 0 si no se paga nada. |  |
| `caseworker.editor.submit` | Update the household | Actualizar el hogar |  |
| `caseworker.editor.chips.where` | Place | Lugar |  |
| `caseworker.editor.chips.household` | Household | Hogar |  |
| `caseworker.editor.chips.pay` | Pay | Pago |  |
| `caseworker.editor.chips.rent` | Rent | Renta |  |
| `caseworker.editor.chips.childcare` | Child care | Cuidado de niños |  |
| `caseworker.editor.chips.age` | Age | Edad |  |
| `caseworker.editor.chips.spouseAge` | Spouse's age | Edad del cónyuge |  |
| `caseworker.editor.chips.spousePay` | Spouse's pay | Pago del cónyuge |  |
| `caseworker.editor.chips.ssdi` | SSDI | SSDI |  |
| `caseworker.editor.chips.childSupport` | Child support | Manutención de hijos |  |
| `caseworker.editor.chips.unemployment` | Unemployment | Desempleo |  |
| `caseworker.editor.chips.savings` | Savings | Ahorros |  |
| `caseworker.editor.chips.status` | Status | Estatus |  |
| `caseworker.editor.chips.spouseStatus` | Spouse's status | Estatus del cónyuge |  |
| `caseworker.editor.chips.kidsDisabled` | Children with a disability | Niños con una discapacidad |  |
| `caseworker.editor.chips.childcareSubsidy` | CCDF subsidy | Subsidio CCDF |  |
| `caseworker.editor.chips.headStart` | Head Start | Head Start |  |
| `caseworker.editor.chips.housing` | Housing voucher | Vale de vivienda |  |
| `caseworker.editor.chips.energyAssistance` | LIHEAP | LIHEAP |  |
| `caseworker.editor.chips.heatInRent` | Heat in rent | Calefacción en la renta |  |
| `caseworker.editor.chips.employerCoverage` | Employer coverage | Cobertura del empleador |  |
| `caseworker.editor.chips.selfEmployed` | Self-employed | Cuenta propia |  |
| `caseworker.editor.chips.disabled` | Disability | Discapacidad |  |
| `caseworker.editor.chips.spouseDisabled` | Spouse's disability | Discapacidad del cónyuge |  |
| `caseworker.editor.chips.snap` | SNAP | SNAP |  |
| `caseworker.editor.chips.tanf` | TANF | TANF |  |
| `caseworker.editor.chips.medicaid` | Medicaid | Medicaid |  |
| `caseworker.editor.chips.wic` | WIC | WIC |  |
| `caseworker.editor.chips.yes` | on | sí |  |
| `caseworker.editor.chips.no` | off | no |  |
| `caseworker.editor.errors.check` | Check {label}. | Revise {label}. |  |
| `caseworker.editor.errors.fields.zip` | the ZIP code | el código postal |  |
| `caseworker.editor.errors.fields.state` | the ZIP code or state | el código postal o el estado |  |
| `caseworker.editor.errors.fields.annualEarnings` | the pay | el pago |  |
| `caseworker.editor.errors.fields.hoursPerWeek` | the hours | las horas |  |
| `caseworker.editor.errors.fields.childAges` | the children's ages | las edades de los niños |  |
| `caseworker.editor.errors.fields.age` | the age | la edad |  |
| `caseworker.editor.errors.fields.spouseAge` | the spouse's age | la edad del cónyuge |  |
| `caseworker.editor.errors.fields.monthlyRent` | the rent | la renta |  |
| `caseworker.editor.errors.fields.monthlyChildcare` | the child care cost | el gasto en cuidado de niños |  |
| `caseworker.editor.errors.fields.spouseAnnualEarnings` | the spouse's pay | el pago del cónyuge |  |
| `caseworker.editor.errors.fields.ssdiMonthly` | SSDI | el SSDI |  |
| `caseworker.editor.errors.fields.childSupportMonthly` | child support | la manutención de hijos |  |
| `caseworker.editor.errors.fields.unemploymentMonthly` | unemployment pay | el pago por desempleo |  |
| `caseworker.editor.errors.fields.savings` | savings | los ahorros |  |
| `caseworker.editor.errors.fields.youStatus` | the status | el estatus |  |
| `caseworker.editor.errors.fields.spouseStatus` | the spouse's status | el estatus del cónyuge |  |
| `caseworker.editor.errors.fields.youYearsInUs` | years in the US | los años en EE. UU. |  |
| `caseworker.editor.errors.fields.spouseYearsInUs` | the spouse's years in the US | los años del cónyuge en EE. UU. |  |
| `caseworker.editor.errors.fields.childDisabled` | which children have a disability | qué niños tienen una discapacidad |  |
| `caseworker.editor.errors.fields.countyFips` | the county | el condado |  |
| `caseworker.actions.whatIf` | Add a what-if | Agregar un escenario |  |
| `caseworker.actions.whatIfShort` | What-if | Escenario |  |
| `caseworker.actions.print` | Print the client sheet | Imprimir la hoja del cliente |  |
| `caseworker.actions.printShort` | Print | Imprimir |  |
| `caseworker.actions.addAsWhatIf` | Add as a what-if | Agregar como escenario |  |
| `caseworker.page.title` | Benefits cliffs for one household, with what-ifs | Precipicios de beneficios de un hogar, con escenarios |  |
| `caseworker.page.skip` | Skip to the answer | Ir a la respuesta |  |
| `caseworker.page.coverageHeading` | Model coverage in {state} | Cobertura del modelo en {state} |  |
| `caseworker.page.correctionsHeading` | Corrections applied in {state} | Correcciones aplicadas en {state} |  |
| `caseworker.page.readoutHint` | Drag, or use the arrow keys, to read any pay. | Arrastre, o use las flechas, para leer cualquier sueldo. |  |
| `caseworker.page.dropsHeading` | Every step down | Cada escalón hacia abajo |  |
| `caseworker.page.dropsCaption` | Select a row or its mark for the breakdown. | Seleccione una fila o su marca para ver el desglose. |  |
| `caseworker.page.dropsCols.earnings` | Earnings | Ingresos |  |
| `caseworker.page.dropsCols.drop` | Drop | Caída |  |
| `caseworker.page.dropsCols.lost` | Programs lost | Programas perdidos |  |
| `caseworker.page.dropsCols.driver` | Driver | Causa |  |
| `caseworker.page.breakdownFootnote` | The four shares sum to the drop exactly. A share right of zero adds to the loss; one left of it offsets the loss — here, a falling tax bill. Medicaid and CHIP never appear: their value is a coverage sticker price, never cash, so it cannot move net income. A child losing coverage shows in programs lost instead. | Las cuatro partes suman exactamente la caída. Una parte a la derecha del cero se suma a la pérdida; una a la izquierda la compensa — aquí, una factura de impuestos que baja. Medicaid y CHIP nunca aparecen: su valor es el precio de lista de la cobertura, nunca efectivo, así que no puede mover el ingreso neto. Un niño que pierde la cobertura aparece en los programas perdidos. |  |
| `caseworker.page.ledgerHeading` | Where each program ends | Dónde termina cada programa |  |
| `caseworker.page.ledgerCaption` | A program ends at the first pay at which it is gone. Adults and children are reported separately — a parent usually loses coverage far below a child’s limit. | Un programa termina en el primer pago en el que ya no está. Los adultos y los niños se informan por separado: un padre suele perder la cobertura muy por debajo del límite de un niño. |  |
| `caseworker.page.ledgerCols.earnings` | Earnings | Ingresos |  |
| `caseworker.page.ledgerCols.program` | Program | Programa |  |
| `caseworker.page.ledgerCols.who` | Who | Quién |  |
| `caseworker.page.compareHeading` | Compare the what-ifs | Comparar los escenarios |  |
| `caseworker.page.compareCaption` | The same rules asked of each what-if. | Las mismas reglas aplicadas a cada escenario. |  |
| `caseworker.page.compareEmpty` | No what-if yet. Press a take-up chip, or Add a what-if, and its curve joins this one. | Todavía no hay escenarios. Pulse un chip de participación, o Agregar un escenario, y su curva se dibuja junto a esta. |  |
| `caseworker.page.assumptionsHeading` | What we assumed | Lo que supusimos |  |
| `caseworker.page.readoutKeys` | Square brackets step between cliffs; Enter opens a cliff's row and Escape closes it. | Los corchetes saltan entre precipicios; Enter abre la fila de uno y Escape la cierra. |  |
| `caseworker.page.howTo` | How to read this picture | Cómo leer esta gráfica |  |
| `caseworker.page.stepsHeading` | What this family faces, step by step | Lo que enfrenta esta familia, escalón por escalón |  |
| `caseworker.page.sourcesHeading` | Where these numbers come from | De dónde salen estas cifras |  |
| `caseworker.page.reachHeading` | How common this pay is | Qué tan común es este sueldo |  |
| `caseworker.page.estimates` | These are estimates from the rules in force, not a determination. A caseworker decides real help. | Son estimaciones según las reglas vigentes, no una determinación. Un trabajador social decide la ayuda real. |  |
| `caseworker.page.who` | {adults} in {state}, {earnings} of earnings. | {adults} en {state}, {earnings} de ingresos. |  |
| `caseworker.page.archetype` | These are the committed sweep's numbers for a household of this shape in {state}, not this family's own live call. | Estas son las cifras del barrido comprometido para un hogar de esta forma en {state}, no la llamada en vivo de esta familia. |  |
| `caseworker.page.stillArchetype` | Still the committed sweep's numbers for a household of this shape in {state}: the live call did not answer. | Siguen siendo las cifras del barrido comprometido para un hogar de esta forma en {state}: la llamada en vivo no respondió. |  |
| `caseworker.status.loading` | Evaluating… net income is checked at {count} pay levels. A household not seen before takes a few seconds. | Evaluando… el ingreso neto se revisa en {count} niveles de pago. Un hogar nuevo tarda unos segundos. |  |
| `caseworker.status.errorTitle` | The evaluation did not come back. | La evaluación no regresó. |  |
| `caseworker.status.errors.rate_limited` | Too many evaluations in a minute. Wait a minute and try again. | Demasiadas evaluaciones en un minuto. Espere un minuto y vuelva a intentarlo. |  |
| `caseworker.status.errors.busy` | The engine is busy. Try again in a few seconds. | El motor está ocupado. Vuelva a intentarlo en unos segundos. |  |
| `caseworker.status.errors.other` | The engine did not reply. Nothing was saved. Try again in a minute. | El motor no respondió. No se guardó nada. Vuelva a intentarlo en un minuto. |  |
| `caseworker.status.errors.badInput` | Not a household: {detail}. | No es un hogar: {detail}. |  |
| `caseworker.status.tryAgain` | Try again | Intentar de nuevo |  |
| `caseworker.whatIf.added` | What-if added: {label}, evaluated beside the base under | Escenario agregado: {label}, evaluado junto al caso base bajo |  |
| `caseworker.whatIf.addedAfterLink` | . The chips show the base. | . Los chips muestran el caso base. |  |
| `caseworker.whatIf.compareLink` | Compare | Comparar |  |
| `caseworker.whatIf.removed` | What-if removed: {label}. | Escenario eliminado: {label}. |  |
| `caseworker.whatIf.already` | {label} is already compared. | {label} ya está en la comparación. |  |
| `caseworker.whatIf.now` | Now | Ahora |  |
| `caseworker.whatIf.computing` | computing | calculando |  |
| `caseworker.whatIf.failed` | did not come back | no regresó |  |
| `caseworker.whatIf.notInSweep` | not in the sweep — needs the live call | no está en el barrido — necesita la llamada en vivo |  |
| `caseworker.whatIf.archetype` | (archetype) | (arquetipo) |  |
| `caseworker.whatIf.thisWhatIf` | This what-if | Este escenario |  |
| `caseworker.whatIf.remove` | Remove | Quitar |  |
| `caseworker.whatIf.removeAria` | Remove the what-if {title} | Quitar el escenario {title} |  |
| `caseworker.whatIf.ellipsis` | … | … |  |
| `caseworker.whatIf.dash` | — | — |  |
| `caseworker.whatIf.married` | Married | Casado |  |
| `caseworker.whatIf.single` | Single | Soltero |  |
| `caseworker.whatIf.cleared` | {label} cleared | {label} en blanco |  |
| `caseworker.whatIf.place` | Place {where} | Lugar {where} |  |
| `caseworker.whatIf.pay` | Pay {pay} | Pago {pay} |  |
| `caseworker.whatIf.monthly` | {label} {amount} a month | {label} {amount} al mes |  |
| `caseworker.whatIf.yearly` | {label} {amount} a year | {label} {amount} al año |  |
| `caseworker.whatIf.figure` | {label} {amount} | {label} {amount} |  |
| `caseworker.whatIf.children` | Children {ages} | Niños {ages} |  |
| `caseworker.whatIf.valued` | {label} {value} | {label} {value} |  |
| `caseworker.whatIf.toggled.on` | {label} on | {label} sí |  |
| `caseworker.whatIf.toggled.off` | {label} off | {label} no |  |
| `caseworker.whatIf.names.zip` | ZIP | Código postal |  |
| `caseworker.whatIf.names.state` | State | Estado |  |
| `caseworker.whatIf.names.county` | County | Condado |  |
| `caseworker.whatIf.names.age` | Age | Edad |  |
| `caseworker.whatIf.names.spouse-age` | Spouse's age | Edad del cónyuge |  |
| `caseworker.whatIf.names.kids` | Children | Niños |  |
| `caseworker.whatIf.names.kids-disabled` | Children with a disability | Niños con una discapacidad |  |
| `caseworker.whatIf.names.rent` | Rent | Renta |  |
| `caseworker.whatIf.names.childcare` | Child care | Cuidado de niños |  |
| `caseworker.whatIf.names.earnings` | Earnings | Ingresos |  |
| `caseworker.whatIf.names.pay` | Pay | Pago |  |
| `caseworker.whatIf.names.unit` | Pay unit | Unidad de pago |  |
| `caseworker.whatIf.names.hours` | Hours a week | Horas a la semana |  |
| `caseworker.whatIf.names.spouse-earnings` | Spouse's pay | Pago del cónyuge |  |
| `caseworker.whatIf.names.ssdi` | SSDI | SSDI |  |
| `caseworker.whatIf.names.child-support` | Child support | Manutención de hijos |  |
| `caseworker.whatIf.names.unemployment` | Unemployment | Desempleo |  |
| `caseworker.whatIf.names.savings` | Savings | Ahorros |  |
| `caseworker.whatIf.names.status` | Status | Estatus |  |
| `caseworker.whatIf.names.spouse-status` | Spouse's status | Estatus del cónyuge |  |
| `caseworker.whatIf.names.years-in-us` | Years in the US | Años en EE. UU. |  |
| `caseworker.whatIf.names.spouse-years-in-us` | Spouse's years in the US | Años del cónyuge en EE. UU. |  |
| `caseworker.verdict.again` | It happens again between {exit} and {safe}. | Pasa otra vez entre {exit} y {safe}. |  |
| `caseworker.verdict.safeFrom.exact` | Safe from {safe}: a raise of {leap}. | A salvo desde {safe}: un aumento de {leap}. |  |
| `caseworker.verdict.safeFrom.atLeast` | Safe from {safe}: a raise of {leap} or more. | A salvo desde {safe}: un aumento de {leap} o más. |  |
| `caseworker.verdict.neverSafe` | The sweep never found a pay past which no zone remains. | El barrido nunca encontró un pago pasado el cual no quede ninguna zona. |  |
| `caseworker.tiles.net` | Net, after premiums | Neto, después de primas |  |
| `caseworker.tiles.netSub` | at {earned} earned | con {earned} de ingresos |  |
| `caseworker.tiles.raise` | Raise to clear the zone | Aumento para salir de la zona |  |
| `caseworker.tiles.raiseTo` | to {exit} earned | hasta {exit} de ingresos |  |
| `caseworker.tiles.raiseNotFound` | not found below {top} | no encontrado por debajo de {top} |  |
| `caseworker.tiles.atLeast` | > {n} | > {n} |  |
| `caseworker.tiles.nextCliff` | Next cliff | Próxima caída |  |
| `caseworker.tiles.drop` | Largest drop anywhere on the curve | Mayor caída en cualquier punto de la curva |  |
| `caseworker.tiles.dropAt` | at {from} → {to} | en {from} → {to} |  |
| `caseworker.tiles.reach` | Reach at current earnings | Alcance con los ingresos actuales |  |
| `caseworker.tiles.reachSub` | percentile, ±{moe} (n = {n}) | percentil, ±{moe} (n = {n}) |  |
| `caseworker.coverage.unknown` | Coverage unknown for {state}. | Cobertura desconocida para {state}. |  |
| `caseworker.coverage.noBlock` | The sweep on this site recorded no coverage block for this state, so nothing here can say what the model leaves out. | El barrido de este sitio no registró un bloque de cobertura para este estado, así que nada aquí puede decir qué deja fuera el modelo. |  |
| `caseworker.coverage.notLoaded` | The weekly sweep's summary did not load, so nothing here can say what the model leaves out. Reload to try again. | El resumen del barrido semanal no cargó, así que nada aquí puede decir qué deja fuera el modelo. Recargue para intentarlo de nuevo. |  |
| `caseworker.coverage.incomplete` | Figures incomplete in {state}. | Cifras incompletas en {state}. |  |
| `caseworker.coverage.incompleteBody` | The model cannot compute {programs} here, so a cliff this household would meet is missing from this curve. Every figure on this page is a floor, not a measurement. Do not read this household as better off than one in a state the model can complete. | El modelo no puede calcular {programs} aquí, así que a esta curva le falta un precipicio que este hogar sí encontraría. Cada cifra de esta página es un piso, no una medición. No lea a este hogar como mejor situado que uno en un estado que el modelo sí puede completar. |  |
| `caseworker.coverage.complete` | Figures complete for {state}. | Cifras completas para {state}. |  |
| `caseworker.coverage.completeBody` | Nothing this household would hold is unmodelled here. | Nada de lo que este hogar tendría queda sin modelar aquí. |  |
| `caseworker.coverage.elsewhere` | {n, plural, one {In 1 state ({states}) this line would carry the} other {In {n} states ({states}) this line would carry the}} | {n, plural, one {En 1 estado ({states}) esta línea llevaría la} other {En {n} estados ({states}) esta línea llevaría la}} |  |
| `caseworker.coverage.elsewhereAfterMark` | mark and every figure on the page would be a floor. | marca y cada cifra de la página sería un piso. |  |
| `caseworker.corrections.none` | None | Ninguna |  |
| `caseworker.corrections.noneBody` | No HotGap-side correction touches this state's numbers. | Ninguna corrección del lado de HotGap toca los números de este estado. |  |
| `caseworker.corrections.unknown` | Unknown | Desconocido |  |
| `caseworker.corrections.unknownBody` | The coverage block did not load, so the corrections behind these numbers cannot be listed. | El bloque de cobertura no cargó, así que no se pueden listar las correcciones detrás de estos números. |  |
| `caseworker.corrections.source` | source | fuente |  |
| `caseworker.corrections.tafdc` | TAFDC (MA) | TAFDC (MA) |  |
| `caseworker.corrections.tafdcChecked` | TAFDC | TAFDC |  |
| `caseworker.corrections.premiumHelp` | State premium help | Ayuda estatal con las primas |  |
| `caseworker.corrections.coverageGap` | Coverage gap | Brecha de cobertura |  |
| `caseworker.corrections.rest` | Checked and not applying here — {items} | Revisadas y no aplicables aquí — {items} |  |
| `caseworker.corrections.checked` | {program}: {note} | {program}: {note} |  |
| `caseworker.drops.range` | {from} → {to} | {from} → {to} |  |
| `caseworker.drops.noneNamed` | none named | ninguno identificado |  |
| `caseworker.drops.deferred` | Deferred | Diferido |  |
| `caseworker.drops.until` | until {when} | hasta {when} |  |
| `caseworker.drops.empty` | No step down of {min} or more anywhere on this curve. | Ningún escalón hacia abajo de {min} o más en toda esta curva. |  |
| `caseworker.drops.drivers.benefits` | benefits | beneficios |  |
| `caseworker.drops.drivers.credits` | credits | créditos |  |
| `caseworker.drops.drivers.premiums` | premiums | primas |  |
| `caseworker.drops.drivers.other` | other | otros |  |
| `caseworker.breakdown.idle` | Where a drop went | A dónde fue una caída |  |
| `caseworker.breakdown.idleBody` | Select a step above, or a mark on the chart. | Seleccione un escalón arriba, o una marca en la gráfica. |  |
| `caseworker.breakdown.title` | Where the {drop} went — {from} to {to} | A dónde fueron los {drop} — de {from} a {to} |  |
| `caseworker.breakdown.parts.benefits` | Benefits | Beneficios |  |
| `caseworker.breakdown.parts.credits` | Credits | Créditos |  |
| `caseworker.breakdown.parts.premiums` | Premiums | Primas |  |
| `caseworker.breakdown.parts.other` | Other | Otros |  |
| `caseworker.breakdown.offsets` | offsets the loss | compensa la pérdida |  |
| `caseworker.breakdown.adds` | adds to the loss | se suma a la pérdida |  |
| `caseworker.breakdown.sum` | Sums to {drop}, the drop. Driver: {driver}. | Suma {drop}, la caída. Causa: {driver}. |  |
| `caseworker.ledger.who.Adult` | Adult | Adulto |  |
| `caseworker.ledger.who.Children` | Children | Niños |  |
| `caseworker.ledger.who.Household` | Household | Hogar |  |
| `caseworker.ledger.deferred` | Deferred | Diferido |  |
| `caseworker.ledger.continues.open` | {left} a year of {program} continues at {at}. | {left} al año de {program} continúan en {at}. |  |
| `caseworker.ledger.continues.closed` | {left} a year of {program} continues at {at}, none from {goneAt}. | {left} al año de {program} continúan en {at}, nada desde {goneAt}. |  |
| `caseworker.ledger.careWorth.priced` | Worth {worth} a year at {at}. Care priced at {monthly} a month for {kids} ({price} prices, carried to {year} dollars by the BLS Employment Cost Index). | Vale {worth} al año en {at}. Cuidado tasado en {monthly} al mes por {kids} (precios de {price}, llevados a dólares de {year} con el Índice de Costo del Empleo del BLS). |  |
| `caseworker.ledger.careWorth.unpriced` | Worth {worth} a year at {at}. Care priced at {monthly} a month for {kids}. | Vale {worth} al año en {at}. Cuidado tasado en {monthly} al mes por {kids}. |  |
| `caseworker.ledger.kids` | {n, plural, one {{n} child} other {{n} children}} | {n, plural, one {{n} niño} other {{n} niños}} |  |
| `caseworker.ledger.medicaidEnds.flat` | Coverage ends with the raise (no deferral applies). | La cobertura termina con el aumento (no aplica ningún diferimiento). |  |
| `caseworker.ledger.medicaidEnds.premium` | Coverage ends with the raise (no deferral applies); the net premium rises {premiumRise} in the step. | La cobertura termina con el aumento (no aplica ningún diferimiento); la prima neta sube {premiumRise} en el escalón. |  |
| `caseworker.ledger.acaEnds.alone` | Net premium rises {premiumRise} in one step. | La prima neta sube {premiumRise} en un escalón. |  |
| `caseworker.ledger.acaEnds.withHelp` | Net premium rises {premiumRise} in one step; {program} ({amount}) ends with it. | La prima neta sube {premiumRise} en un escalón; {program} ({amount}) termina con ella. |  |
| `caseworker.ledger.toChip` | The children move to CHIP: {amount} a year of coverage from {at}. | Los niños pasan a CHIP: {amount} al año de cobertura desde {at}. |  |
| `caseworker.ledger.eitc` | Phases out; no step of {min} or more, so it is not a cliff. | Se reduce gradualmente; ningún escalón de {min} o más, así que no es un precipicio. |  |
| `caseworker.ledger.chipEnds` | The premium tax credit rises {ptcRise} as it ends. | El crédito fiscal para las primas sube {ptcRise} cuando termina. |  |
| `caseworker.ledger.deferredUntil` | Crossing this does not end it this year: the loss lands at {when}. | Cruzar este punto no lo termina este año: la pérdida cae en {when}. |  |
| `caseworker.ledger.cashNever` | Cash benefits never end inside this axis. | Los beneficios en efectivo nunca terminan dentro de este eje. |  |
| `caseworker.ledger.cashEnds` | The last cash benefit ends at {at}. | El último beneficio en efectivo termina en {at}. |  |
| `caseworker.ledger.childCoverageEnds` | Child coverage ends at {at}, deferred. | La cobertura de los niños termina en {at}, diferida. |  |
| `caseworker.ledger.gapApplies` | Coverage gap band applies: {note} | Aplica la banda de brecha de cobertura: {note} |  |
| `caseworker.ledger.gapNone` | No coverage gap band: {note} | Sin banda de brecha de cobertura: {note} |  |
| `caseworker.ledger.premiumModeled` | {program} is modeled: netted out of the premium, up to {max} a year. | {program} está modelado: se descuenta de la prima, hasta {max} al año. |  |
| `caseworker.ledger.premiumLadder` | {program} is applied from a local ladder. | {program} se aplica desde una escala local. |  |
| `caseworker.ledger.premiumUnmodeled` | {program} exists but is not modeled on this sweep. | {program} existe pero no está modelado en este barrido. |  |
| `caseworker.ledger.premiumNone` | No state premium help applies. | No aplica ninguna ayuda estatal con las primas. |  |
| `caseworker.ledger.ifYouApply` | if you apply | si lo solicita |  |
| `caseworker.ledger.liheapBoundary` | {limit}, the heating limit. {worthServed} Not counted unless the household says it gets it. Read {readOn}. | Límite de calefacción: {limit}. {worthServed} No se cuenta a menos que el hogar diga que lo recibe. Leído el {readOn}. |  |
| `caseworker.ledger.liheapWorthServed.bandKnown` | Worth {band} at that band if received; {pct}% of income-eligible households were served in {vintage}. | Vale {band} en esa banda si se recibe; el {pct}% de los hogares elegibles por ingreso fueron atendidos en {vintage}. |  |
| `caseworker.ledger.liheapWorthServed.bandUnread` | Worth {band} at that band if received; the {vintage} share of income-eligible households served was not read. | Vale {band} en esa banda si se recibe; la proporción de hogares elegibles por ingreso atendidos en {vintage} no se leyó. |  |
| `caseworker.ledger.liheapWorthServed.unreadKnown` | The amount at that band was not read; {pct}% of income-eligible households were served in {vintage}. | El monto en esa banda no se leyó; el {pct}% de los hogares elegibles por ingreso fueron atendidos en {vintage}. |  |
| `caseworker.ledger.liheapWorthServed.unreadUnread` | The amount at that band was not read; the {vintage} share of income-eligible households served was not read. | El monto en esa banda no se leyó; la proporción de hogares elegibles por ingreso atendidos en {vintage} no se leyó. |  |
| `caseworker.ledger.liheapCredit` | {paidAs} {served} {heat} Read {readOn}. | {paidAs} {served} {heat} Leído el {readOn}. |  |
| `caseworker.ledger.liheapPaidAs.named` | Paid as the {program}, a refundable state credit PolicyEngine models and HotGap counts in state credits; it tapers out by the state's limit, {limit}, so it is not a cliff. | Se paga como el {program}, un crédito estatal reembolsable que PolicyEngine modela y HotGap cuenta en los créditos estatales; se reduce gradualmente hasta el límite del estado, {limit}, así que no es un precipicio. |  |
| `caseworker.ledger.liheapPaidAs.unnamed` | Paid as a refundable state credit PolicyEngine models and HotGap counts in state credits; it tapers out by the state's limit, {limit}, so it is not a cliff. | Se paga como un crédito estatal reembolsable que PolicyEngine modela y HotGap cuenta en los créditos estatales; se reduce gradualmente hasta el límite del estado, {limit}, así que no es un precipicio. |  |
| `caseworker.ledger.liheapServed.known` | {pct}% of income-eligible households were served in {vintage}. | El {pct}% de los hogares elegibles por ingreso fueron atendidos en {vintage}. |  |
| `caseworker.ledger.liheapServed.unread` | The {vintage} share of income-eligible households served was not read. | La proporción de hogares elegibles por ingreso atendidos en {vintage} no se leyó. |  |
| `caseworker.ledger.liheapHeat.inRent` | Heat is included in the rent, so the credit is halved. | La calefacción está incluida en la renta, así que el crédito se reduce a la mitad. |  |
| `caseworker.ledger.liheapHeat.notInRent` | Assumes heat is not included in rent; the credit halves when it is. | Supone que la calefacción no está incluida en la renta; el crédito se reduce a la mitad cuando lo está. |  |
| `caseworker.ledger.liheapCounted` | Counted at the household's say-so: {amount} a year from HotGap's table of the state's published schedule, to the {limit} limit. PolicyEngine serves no LIHEAP amount on this payload. | Contado según lo dicho por el hogar: {amount} al año de la tabla de HotGap con el calendario publicado del estado, hasta el límite de {limit}. PolicyEngine no entrega ningún monto de LIHEAP con esta carga. |  |
| `caseworker.ledger.liheapBand.flat` | {min} | {min} |  |
| `caseworker.ledger.liheapBand.range` | {min}–{max} | {min}–{max} |  |
| `caseworker.chart.title` | Net income after premiums, {from}–{to} of earnings | Ingreso neto después de primas, de {from} a {to} de ingresos |  |
| `caseworker.chart.label.lead` | Net income after premiums against earnings, {from} to {to}. | Ingreso neto después de primas frente a ingresos, de {from} a {to}. |  |
| `caseworker.chart.label.zones` | {n, plural, =0 {No danger zone.} one {{n} danger zone.} other {{n} danger zones.}} | {n, plural, =0 {Sin zona de peligro.} one {{n} zona de peligro.} other {{n} zonas de peligro.}} |  |
| `caseworker.chart.label.own.toExit` | This household's runs from {start} to {exit}. | La de este hogar va de {start} a {exit}. |  |
| `caseworker.chart.label.own.toExitRaise` | This household's runs from {start} to {exit}, cleared by a raise of {raise}. | La de este hogar va de {start} a {exit}, y se sale con un aumento de {raise}. |  |
| `caseworker.chart.label.own.toTop` | This household's runs from {start} to the top of the axis. | La de este hogar va de {start} al tope del eje. |  |
| `caseworker.chart.label.own.toTopRaise` | This household's runs from {start} to the top of the axis, cleared by a raise of {raise}. | La de este hogar va de {start} al tope del eje, y se sale con un aumento de {raise}. |  |
| `caseworker.chart.label.worst` | {n, plural, =0 {The largest step down is {drop} at {at}.} one {The largest step down is {drop} at {at} where {programs} ends.} other {The largest step down is {drop} at {at} where {programs} end.}} | {n, plural, =0 {El mayor escalón hacia abajo es de {drop} en {at}.} one {El mayor escalón hacia abajo es de {drop} en {at}, donde termina {programs}.} other {El mayor escalón hacia abajo es de {drop} en {at}, donde terminan {programs}.}} |  |
| `caseworker.chart.label.safe.none` | No pay on the axis is past every zone. | Ningún pago del eje está más allá de todas las zonas. |  |
| `caseworker.chart.label.safe.from` | Safe from {safe}. | Seguro desde {safe}. |  |
| `caseworker.chart.cliff.lead` | Cliff at {from} to {to}: {drop}. | Precipicio en {from} a {to}: {drop}. |  |
| `caseworker.chart.cliff.lost` | {n, plural, =0 {No program named.} one {{programs} ends.} other {{programs} end.}} | {n, plural, =0 {Ningún programa identificado.} one {Termina {programs}.} other {Terminan {programs}.}} |  |
| `caseworker.chart.cliff.driver` | Driver: {driver}. | Causa: {driver}. |  |
| `caseworker.chart.cliff.deferred` | Deferred until {until}. | Diferido hasta {until}. |  |
| `caseworker.chart.merged` | {n} drops between {from} and {to}, together {sum} a year. | {n} caídas entre {from} y {to}, juntas {sum} al año. |  |
| `caseworker.chart.later` | later | más adelante |  |
| `caseworker.chart.backToEven` | back to even | de vuelta a la par |  |
| `caseworker.chart.backToEvenAndSafe` | back to even, and safe from here | de vuelta a la par, y a salvo de aquí en adelante |  |
| `caseworker.chart.safeFromHere` | safe from here | a salvo de aquí en adelante |  |
| `caseworker.chart.leap.exact` | +{raise} | +{raise} |  |
| `caseworker.chart.leap.atLeast` | more than +{raise} | más de +{raise} |  |
| `caseworker.chart.key.net` | Net income | Ingreso neto |  |
| `caseworker.chart.key.ownZone` | This household's zone | Zona de este hogar |  |
| `caseworker.chart.key.otherZones` | Other zones | Otras zonas |  |
| `caseworker.chart.key.zones` | Danger zones | Zonas de peligro |  |
| `caseworker.chart.key.immediate` | Immediate cliff | Precipicio inmediato |  |
| `caseworker.chart.key.deferred` | Deferred cliff | Precipicio diferido |  |
| `caseworker.chart.key.current` | Current earnings | Ingresos actuales |  |
| `caseworker.chart.key.leap` | The leap, to the exit | El salto, hasta la salida |  |
| `caseworker.chart.key.safe` | Safe from here | A salvo de aquí en adelante |  |
| `caseworker.chart.key.road` | 100% to 200% of the poverty guideline | Del 100% al 200% de la pauta de pobreza |  |
| `caseworker.chart.key.whatIf` | What-if: {tag} | Escenario: {tag} |  |
| `caseworker.chart.readout.lead` | Earnings {earnings} → net {net}. | Ingresos {earnings} → neto {net}. |  |
| `caseworker.chart.readout.outside` | Outside any danger zone. | Fuera de toda zona de peligro. |  |
| `caseworker.chart.readout.own.toExit` | Inside the household's danger zone (ends {end}; peak {peak} at {start}). | Dentro de la zona de peligro del hogar (termina en {end}; pico de {peak} en {start}). |  |
| `caseworker.chart.readout.own.toTop` | Inside the household's danger zone (ends past the axis; peak {peak} at {start}). | Dentro de la zona de peligro del hogar (termina más allá del eje; pico de {peak} en {start}). |  |
| `caseworker.chart.readout.other.toExit` | Inside a later zone ({start}–{end}). | Dentro de una zona posterior ({start}–{end}). |  |
| `caseworker.chart.readout.other.toTop` | Inside a later zone ({start}–the top of the axis). | Dentro de una zona posterior ({start}–el tope del eje). |  |
| `caseworker.chart.axis.fromZero` | The y-axis starts at {floor}; the visible range is {ratio}× the largest drop. | El eje vertical empieza en {floor}; el rango visible es {ratio} veces la mayor caída. |  |
| `caseworker.chart.axis.aboveZero` | The y-axis starts at {floor}, not $0; the visible range is {ratio}× the largest drop. | El eje vertical empieza en {floor}, no en $0; el rango visible es {ratio} veces la mayor caída. |  |
| `caseworker.chart.noneDeferred` | No cliff on this curve is deferred. | Ningún precipicio de esta curva está diferido. |  |
| `caseworker.chart.span.scrolls` | The x-axis runs {from} to {to}; scroll the curve sideways to reach all of it. | El eje de x va de {from} a {to}; deslice la curva de lado a lado para verla toda. |  |
| `caseworker.chart.span.whole` | The x-axis runs {from} to {to}, shown whole. | El eje de x va de {from} a {to}, entero en la página. |  |
| `caseworker.chart.rangeFrom` | ← {from} | ← {from} |  |
| `caseworker.chart.rangeTo` | {to} → | {to} → |  |
| `caseworker.chart.deferred` | {n, plural, one {{n} cliff lands at a later renewal (hollow dot, dashed connector); it counts in every figure here.} other {{n} cliffs land at a later renewal (hollow dots, dashed connectors); they count in every figure here.}} | {n, plural, one {{n} precipicio llega en una renovación posterior (punto hueco, raya discontinua); cuenta en cada cifra de aquí.} other {{n} precipicios llegan en una renovación posterior (puntos huecos, rayas discontinuas); cuentan en cada cifra de aquí.}} |  |
| `caseworker.chart.labels.net.help` | net {net}, help counted | neto {net}, con la ayuda contada |  |
| `caseworker.chart.labels.net.tax` | net {net} after tax | neto {net} después de impuestos |  |
| `caseworker.chart.labels.ends` | {program} ends | {program}: termina aquí |  |
| `caseworker.chart.labels.road.keeps` | keeps {cents}¢ of each extra dollar | se queda con {cents}¢ de cada dólar extra |  |
| `caseworker.chart.labels.road.loses` | loses {cents}¢ of each extra dollar | pierde {cents}¢ de cada dólar extra |  |
| `caseworker.chart.labels.merged` | {n} drops together | {n} caídas juntas |  |
| `caseworker.chart.whatIfLines` | {n, plural, one {One what-if is drawn here as a second line, told apart by its dash and its tag.} other {{n} what-ifs are drawn here as second lines, told apart by their dashes and their tags.}} | {n, plural, one {Un escenario se dibuja aquí como una segunda línea, que se distingue por su trazo y su etiqueta.} other {{n} escenarios se dibujan aquí como líneas adicionales, que se distinguen por sus trazos y sus etiquetas.}} |  |
| `caseworker.chart.whatIfHeld` | {held, plural, one {One more what-if is in the comparison and not on the picture.} other {{held} more what-ifs are in the comparison and not on the picture.}} | {held, plural, one {Queda un escenario más en la comparación que no está en la gráfica.} other {Quedan {held} escenarios más en la comparación que no están en la gráfica.}} |  |
| `caseworker.chart.whatIfPositions` | {n, plural, one {One what-if is this same curve at a different pay: its hollow diamond marks where it lands.} other {{n} what-ifs are this same curve at a different pay: their hollow diamonds mark where they land.}} | {n, plural, one {Un escenario es esta misma curva con otro sueldo: su rombo hueco marca dónde cae.} other {{n} escenarios son esta misma curva con otro sueldo: sus rombos huecos marcan dónde caen.}} |  |
| `caseworker.chart.rangeMid` | swipe to see more | deslice para ver más |  |
| `caseworker.compare.rows.net` | Net after premiums | Neto después de primas |  |
| `caseworker.compare.rows.change` | Change from now | Cambio desde ahora |  |
| `caseworker.compare.rows.keep` | Keeps of each extra dollar | Lo que se queda de cada dólar extra |  |
| `caseworker.compare.rows.inZone` | In a danger zone | En una zona de peligro |  |
| `caseworker.compare.rows.zoneEnds` | Zone ends at | La zona termina en |  |
| `caseworker.compare.rows.raise` | Raise still needed | Aumento que aún falta |  |
| `caseworker.compare.rows.safe` | Safe from | A salvo desde |  |
| `caseworker.compare.rows.drop` | Largest drop | Mayor caída |  |
| `caseworker.compare.rows.adultMedicaid` | Adult Medicaid ends | Medicaid de adulto termina |  |
| `caseworker.compare.rows.childCoverage` | Child coverage ends | Cobertura de niños termina |  |
| `caseworker.compare.rows.reach` | Reach at these earnings | Alcance con estos ingresos |  |
| `caseworker.compare.yes` | Yes | Sí |  |
| `caseworker.compare.no` | No | No |  |
| `caseworker.compare.pastAxis` | past the axis | más allá del eje |  |
| `caseworker.compare.none` | none | ninguna |  |
| `caseworker.compare.dash` | — | — |  |
| `caseworker.compare.sub` | {adults}, {earnings} | {adults}, {earnings} |  |
| `caseworker.compare.adults.one` | 1 adult | 1 adulto |  |
| `caseworker.compare.adults.two` | 2 adults | 2 adultos |  |
| `caseworker.compare.reachNote` | Reach is the share of households of the same shape in {state} earning at or below this figure — it says how common the pay is, never the odds of getting there. | El alcance es la proporción de hogares con la misma forma en {state} que ganan esta cifra o menos: dice qué tan común es el pago, nunca las probabilidades de llegar a él. |  |
| `caseworker.compare.ladderNote` | A column whose household shape differs sits on its own ladder ({other} against {base}), which is why the same pay can sit at a different percentile there. | Una columna cuya forma de hogar difiere está en su propia escala ({other} frente a {base}), y por eso el mismo pago puede quedar en otro percentil ahí. |  |
| `caseworker.compare.archetypeNote` | A column marked archetype is the committed sweep for a household of that shape in this state, not this family's own live call. | Una columna marcada como arquetipo es el barrido comprometido para un hogar de esa forma en este estado, no la llamada en vivo de esta familia. |  |
| `caseworker.compare.unansweredNote` | {n, plural, one {The committed sweep varies only a household's shape and pay, so a what-if that changes something else has no figure until the live call answers.} other {The committed sweep varies only a household's shape and pay, so {n} what-ifs that change something else have no figure until the live call answers.}} | {n, plural, one {El barrido comprometido solo varía la forma y el pago de un hogar, así que un escenario que cambia otra cosa no tiene cifra hasta que responda la llamada en vivo.} other {El barrido comprometido solo varía la forma y el pago de un hogar, así que {n} escenarios que cambian otra cosa no tienen cifra hasta que responda la llamada en vivo.}} |  |
| `caseworker.compare.onTheWay.heading` | On the way — {title} | En el camino — {title} |  |
| `caseworker.compare.onTheWay.empty` | No cliff between here and there. | Ninguna caída entre aquí y allá. |  |
| `caseworker.compare.onTheWay.item` | {n, plural, =0 {{at} — a step down ({drop})} one {{at} — {programs} ends ({drop})} other {{at} — {programs} end ({drop})}} | {n, plural, =0 {{at} — un paso hacia abajo ({drop})} one {{at} — {programs} se termina ({drop})} other {{at} — {programs} se terminan ({drop})}} |  |
| `caseworker.assumed.health` | Health cost is premiums only — no deductibles, copays or other out-of-pocket spending. | El costo de salud son solo las primas: sin deducibles, copagos ni otros gastos de bolsillo. |  |
| `caseworker.assumed.facts` | Assumed for this curve: {facts}; aged {age}. | Supuesto para esta curva: {facts}; {age} años. |  |
| `caseworker.assumed.citizen` | a citizen | ciudadano |  |
| `caseworker.assumed.status` | status: {status} | estatus: {status} |  |
| `caseworker.assumed.savings` | {amount} in savings | {amount} en ahorros |  |
| `caseworker.assumed.noSavings` | no savings | sin ahorros |  |
| `caseworker.assumed.selfEmployed` | self-employed | cuenta propia |  |
| `caseworker.assumed.wages` | wages, not self-employment | salario, no cuenta propia |  |
| `caseworker.assumed.esi` | employer coverage offered | cobertura del empleador ofrecida |  |
| `caseworker.assumed.noEsi` | no employer coverage | sin cobertura del empleador |  |
| `caseworker.assumed.otherIncome` | other income as entered | otros ingresos según lo ingresado |  |
| `caseworker.assumed.noOtherIncome` | no other income | sin otros ingresos |  |
| `caseworker.assumed.takeUp.all` | Take-up assumed for {on}. | Se supone participación en {on}. |  |
| `caseworker.assumed.takeUp.some` | Take-up assumed for {on}; not for {off}. | Se supone participación en {on}; no en {off}. |  |
| `caseworker.assumed.annualised` | Annualised current-rule scenarios, not prorated calendar-year benefit totals. | Escenarios anualizados con las reglas actuales, no totales de beneficios prorrateados por año calendario. |  |
| `caseworker.assumed.unmodeled` | Not modelled in {state}: {program}. {note} | No modelado en {state}: {program}. {note} |  |
| `caseworker.assumed.liheap` | Energy assistance (LIHEAP) in {state}: {note} | Asistencia energética (LIHEAP) en {state}: {note} |  |
| `caseworker.source.lead` | Estimates only — a caseworker decides real benefits. Rules: {year}. Curve: {curve} | Solo estimaciones: un trabajador social decide los beneficios reales. Reglas: {year}. Curva: {curve} |  |
| `caseworker.source.vintages` | Rent: {rent} Child-care price: {care}, carried to {year} dollars by the BLS Employment Cost Index. Reach: {reach} | Renta: {rent} Precio del cuidado de niños: {care}, llevado a dólares de {year} con el Índice de Costo del Empleo del BLS. Alcance: {reach} |  |
| `caseworker.source.other` | Other state benefits in the remainder: {other}. | Otros beneficios estatales en el resto: {other}. |  |
| `caseworker.source.model` | Model: {model}. | Modelo: {model}. |  |
| `caseworker.source.archetype.dated` | committed archetype sweep ({id}), generated {generated} — not this family's own live call. | barrido de arquetipos comprometido ({id}), generado el {generated}; no es la llamada en vivo de esta familia. |  |
| `caseworker.source.archetype.undated` | committed archetype sweep ({id}) — not this family's own live call. | barrido de arquetipos comprometido ({id}); no es la llamada en vivo de esta familia. |  |
| `caseworker.source.clamped` | Pay is above the modeled range — evaluated at {clamped}, the top of the sweep. | El pago está por encima del rango modelado: evaluado en {clamped}, el tope del barrido. |  |
| `caseworker.source.live.inPlace` | live PolicyEngine call for this household in {where}. | llamada en vivo a PolicyEngine para este hogar en {where}. |  |
| `caseworker.source.live.anywhere` | live PolicyEngine call for this household. | llamada en vivo a PolicyEngine para este hogar. |  |
| `caseworker.source.inPlace` | {county}, {state} | {county}, {state} |  |
| `caseworker.source.rent` | {publisher} {vintage} | {publisher} {vintage} |  |
| `caseworker.source.reachVintages` | {basis} Vintages used: {vintages}. | {basis} Ediciones usadas: {vintages}. |  |
| `caseworker.source.otherBenefit` | {label} (up to {max}) | {label} (hasta {max}) |  |
| `caseworker.source.unclaimed` | Off for this household: {items} at {earnings}. | Desactivado para este hogar: {items} con {earnings}. |  |
| `caseworker.source.wouldPay` | {program} would pay {annual} a year | {program} pagaría {annual} al año |  |
| `caseworker.handout.title` | Your pay and your help — {state}, {parents}, {children} | Su sueldo y su ayuda — {state}, {parents}, {children} |  |
| `caseworker.handout.parents.one` | one parent | una madre o un padre |  |
| `caseworker.handout.parents.two` | two parents | dos padres |  |
| `caseworker.handout.children` | {n, plural, =0 {no children} one {one child} other {{words} children}} | {n, plural, =0 {sin niños} one {un niño} other {{words} niños}} |  |
| `caseworker.handout.careShare` | {amount} of what you keep is {phrase} paid straight to your day care. | {amount} de lo que le queda es {phrase} que se paga directo a su guardería. |  |
| `caseworker.handout.biggestDrop` | {n, plural, =0 {The biggest drop is at {at} of pay: your tax break shrinks and you keep {drop} less.} one {The biggest drop is at {at} of pay: {phrases} ends and you keep {drop} less.} other {The biggest drop is at {at} of pay: {phrases} end and you keep {drop} less.}} | {n, plural, =0 {La caída más grande está en {at} de sueldo: su descuento en los impuestos se achica y le quedan {drop} menos.} one {La caída más grande está en {at} de sueldo: se termina {phrases} y le quedan {drop} menos.} other {La caída más grande está en {at} de sueldo: se terminan {phrases} y le quedan {drop} menos.}} |  |
| `caseworker.handout.snapEnds` | Food help ends at {at}. | La ayuda para la comida se termina en {at}. |  |
| `caseworker.handout.kidsCoverage` | Your kids' health plan ends at {at} of pay — but not that year. It ends at their next yearly check, up to 12 months later. | El plan de salud de sus niños se termina en {at} de sueldo, pero no ese mismo año. Se termina en su próxima revisión anual, hasta 12 meses después. |  |
| `caseworker.handout.estimates` | These are estimates. A case worker decides real help. | Son estimaciones. Un trabajador social decide la ayuda real. |  |
| `caseworker.handout.printed.dated` | Printed from HotGap. {year} rules. Sweep of {sweep}. | Impreso desde HotGap. Reglas de {year}. Barrido del {sweep}. |  |
| `caseworker.handout.printed.undated` | Printed from HotGap. {year} rules. | Impreso desde HotGap. Reglas de {year}. |  |
| `caseworker.handout.payAndKeep` | You're paid {pay} a year, and with help counted you keep {kept}. | A usted le pagan {pay} al año y, contando la ayuda, le quedan {kept}. |  |
| `caseworker.pageTitle` | HotGap — caseworker | HotGap — trabajador social |  |
| `caseworker.answer.inZone` | This family loses money on every raise between {start} and {exit}; {raise} clears the stretch. | Esta familia pierde dinero con cada aumento entre {start} y {exit}; con {raise} más al año ya sale de la zona. |  |
| `caseworker.answer.inZone:stuck` | This family loses money on every raise above {start}, and no exit turns up below {top}. | Esta familia pierde dinero con cada aumento por encima de {start}, y no aparece salida por debajo de {top}. |  |
| `caseworker.answer.cliffAhead` | This family is clear up to {at}; past it a raise costs about {drop} a year. | Esta familia está a salvo hasta {at}; pasado eso, un aumento le cuesta unos {drop} al año. |  |
| `caseworker.answer.cliffAhead:waits` | This family is clear up to {at}; past it a raise costs about {drop} a year, at the next renewal rather than that day. | Esta familia está a salvo hasta {at}; pasado eso, un aumento le cuesta unos {drop} al año, en la próxima renovación y no ese mismo día. |  |
| `caseworker.answer.cliffBehind` | The worst is behind this family: from {wage} up, every raise is more money. | Lo peor ya quedó atrás para esta familia: de {wage} en adelante, cada aumento es más dinero. |  |
| `caseworker.answer.alwaysUp` | Every raise leaves this family better off; nothing drops anywhere up to {top}. | Cada aumento deja mejor a esta familia; nada cae en ningún punto hasta {top}. |  |

## Journalist map page — 299 strings

| key | English | Spanish (draft) | Notes |
|---|---|---|---|
| `places.pageTitle` | HotGap — what a raise costs, state by state | HotGap — lo que cuesta un aumento, estado por estado |  |
| `places.wordmark` | HotGap | HotGap |  |
| `places.skip` | Skip to the answer | Ir a la respuesta |  |
| `places.lede.counted.withDc` | {states} states and the District of Columbia, {households} household shapes, one earnings scale — from $0 past 400% of the poverty line for that household. | {states} estados y el Distrito de Columbia, {households} tipos de hogar, una sola escala de ingresos: desde $0 hasta más allá del 400% de la línea de pobreza de ese hogar. |  |
| `places.lede.counted.plain` | {states} states, {households} household shapes, one earnings scale — from $0 past 400% of the poverty line for that household. | {states} estados, {households} tipos de hogar, una sola escala de ingresos: desde $0 hasta más allá del 400% de la línea de pobreza de ese hogar. |  |
| `places.lede.glossary` | A *cliff* is a $1,000 raise that cuts net income by {floor} or more; a *danger zone* is a run of earnings across which the household never gets ahead. A cliff matters in proportion to how many families stand near it: the largest cliff in a state is usually one few families reach, and the one that hurts is the modest one at the income most families have. The figures come from [PolicyEngine](https://policyengine.org), an open-source tax-and-benefit calculator, run by HotGap. | Un *precipicio* es un aumento de $1,000 que recorta el ingreso neto en {floor} o más; una *zona de peligro* es un tramo de ingresos en el que el hogar nunca sale ganando. Un precipicio importa en proporción a cuántas familias están cerca de él: el precipicio más grande de un estado suele ser uno al que llegan pocas familias, y el que duele es el modesto, en el ingreso que tiene la mayoría. Las cifras vienen de [PolicyEngine](https://policyengine.org), una calculadora de impuestos y beneficios de código abierto, ejecutada por HotGap. |  |
| `places.status.loading` | Loading the weekly run… | Cargando la corrida semanal… |  |
| `places.status.failed` | We could not load the weekly run: {reason}. Reload to try again. | No pudimos cargar la corrida semanal: {reason}. Recargue para intentarlo de nuevo. |  |
| `places.status.http` | the data file answered HTTP {status} | el archivo de datos respondió HTTP {status} |  |
| `places.filters.household` | Household | Hogar |  |
| `places.filters.measure` | Measure | Medida |  |
| `places.filters.csv` | Download the numbers (CSV) | Descargar los datos (CSV) |  |
| `places.filters.groups.road` | On the road out of poverty | En el camino para salir de la pobreza |  |
| `places.filters.groups.axis` | Anywhere on the curve | En cualquier punto de la curva |  |
| `places.measures.biggestLoss.title` | Largest one-step loss | Mayor pérdida en un escalón |  |
| `places.measures.biggestLoss.option` | Largest one-step loss — the worst single step anywhere on the curve ($) | Mayor pérdida en un escalón — el peor escalón en cualquier punto de la curva ($) |  |
| `places.measures.biggestLoss.describe` | Net income lost in the worst single $1,000 step of earnings. | Ingreso neto perdido en el peor escalón de $1,000 de ingresos. |  |
| `places.measures.dangerWidth.title` | Total width of the danger zones | Ancho total de las zonas de peligro |  |
| `places.measures.dangerWidth.option` | Total width of the danger zones — every stretch where more pay leaves the household no better off, added together ($) | Ancho total de las zonas de peligro — cada tramo en el que más pago no deja al hogar mejor, sumados ($) |  |
| `places.measures.dangerWidth.describe` | Earnings spanned by every stretch where more pay leaves the household no better off, all such stretches added together. | Ingresos que abarca cada tramo en el que más pago no deja al hogar mejor, todos esos tramos sumados. |  |
| `places.measures.leap.title` | The leap | El salto |  |
| `places.measures.leap.option` | The leap — the raise needed to clear the worst danger zone ($) | El salto — el aumento necesario para salir de la peor zona de peligro ($) |  |
| `places.measures.leap.describe` | The raise a household must clear in one move to get past its worst danger zone. | El aumento que un hogar debe dar de una sola vez para pasar su peor zona de peligro. |  |
| `places.measures.safeExit.title` | Safe exit | Salida segura |  |
| `places.measures.safeExit.option` | Safe exit — earnings above which no danger zone remains ($) | Salida segura — ingresos por encima de los cuales no queda ninguna zona de peligro ($) |  |
| `places.measures.safeExit.describe` | Earnings above which no danger zone remains: where the last one closes. | Ingresos por encima de los cuales no queda ninguna zona de peligro: donde se cierra la última. |  |
| `places.measures.cliffCount.title` | Number of cliffs | Número de precipicios |  |
| `places.measures.cliffCount.option` | Number of cliffs — anywhere on the curve, not only on the road out of poverty | Número de precipicios — en cualquier punto de la curva, no solo en el camino para salir de la pobreza |  |
| `places.measures.cliffCount.describe` | Steps down of {floor} or more anywhere on the curve. | Escalones hacia abajo de {floor} o más en cualquier punto de la curva. |  |
| `places.measures.deferredCliffCount.title` | Deferred cliffs | Precipicios diferidos |  |
| `places.measures.deferredCliffCount.option` | Deferred cliffs — of the cliffs counted, those that land at a later renewal | Precipicios diferidos — de los precipicios contados, los que caen en una renovación posterior |  |
| `places.measures.deferredCliffCount.describe` | Of the cliffs counted, those that land at a later renewal rather than with the raise: Head Start's program-year carry-over, a child's 12 months of continuous Medicaid or CHIP, a parent's Transitional Medical Assistance. | De los precipicios contados, los que caen en una renovación posterior y no con el aumento: la continuidad de Head Start hasta el fin del año del programa, los 12 meses de Medicaid o CHIP continuo de un niño, la Asistencia Médica de Transición de un padre. |  |
| `places.measures.keepRate.title` | Keep rate on the road out of poverty | Lo que se queda de cada dólar en el camino para salir de la pobreza |  |
| `places.measures.keepRate.option` | Keep rate — of each extra dollar earned from poverty to twice poverty, the cents the household keeps (¢) | Lo que se queda de cada dólar — de cada dólar extra ganado de la pobreza al doble de la pobreza, los centavos que el hogar conserva (¢) |  |
| `places.measures.keepRate.describe` | Of each extra dollar earned between the poverty line and twice the poverty line, the cents this household keeps once taxes and lost benefits are counted. Below zero it ends up poorer than it started. | De cada dólar extra ganado entre la línea de pobreza y el doble de esa línea, los centavos que este hogar conserva una vez contados los impuestos y los beneficios perdidos. Por debajo de cero, termina más pobre de lo que empezó. |  |
| `places.measures.roadCliffCount.title` | Cliffs on the road out of poverty | Precipicios en el camino para salir de la pobreza |  |
| `places.measures.roadCliffCount.option` | Cliffs on the road out of poverty — the cliffs a household meets between poverty and twice poverty | Precipicios en el camino para salir de la pobreza — los precipicios que un hogar encuentra entre la pobreza y el doble de la pobreza |  |
| `places.measures.roadCliffCount.describe` | Steps down of {floor} or more between the poverty line and twice the poverty line. | Escalones hacia abajo de {floor} o más entre la línea de pobreza y el doble de esa línea. |  |
| `places.measures.roadWorst.title` | Where the road collapses | Dónde se derrumba el camino |  |
| `places.measures.roadWorst.option` | Where the road collapses — the largest single loss between poverty and twice poverty ($) | Dónde se derrumba el camino — la mayor pérdida en un solo escalón entre la pobreza y el doble de la pobreza ($) |  |
| `places.measures.roadWorst.describe` | Net income lost in the worst single $1,000 step between the poverty line and twice the poverty line. | Ingreso neto perdido en el peor escalón de $1,000 entre la línea de pobreza y el doble de esa línea. |  |
| `places.household.line` | {adults}, {children} | {adults}, {children} |  |
| `places.household.adults.single` | 1 adult | 1 adulto |  |
| `places.household.adults.bothWork` | 2 adults, both working | 2 adultos, ambos trabajan |  |
| `places.household.adults.oneWorks` | 2 adults, one working | 2 adultos, uno trabaja |  |
| `places.household.children` | {n, plural, =0 {no children} one {{n} child ({ages})} other {{n} children ({ages})}} | {n, plural, =0 {sin niños} one {{n} niño ({ages})} other {{n} niños ({ages})}} |  |
| `places.household.phrase.single` | {n, plural, =0 {a childless single adult} one {a single parent of one child} other {a single parent of {words} children}} | {n, plural, =0 {un adulto solo sin hijos} one {una madre o padre solo con un hijo} other {una madre o padre solo con {words} hijos}} |  |
| `places.household.phrase.oneWorks` | {n, plural, =0 {a childless one-earner couple} one {a one-earner couple with one child} other {a one-earner couple with {words} children}} | {n, plural, =0 {una pareja sin hijos y con un solo sueldo} one {una pareja con un hijo y un solo sueldo} other {una pareja con {words} hijos y un solo sueldo}} |  |
| `places.household.phrase.bothWork` | {n, plural, =0 {a childless two-earner couple} one {a two-earner couple with one child} other {a two-earner couple with {words} children}} | {n, plural, =0 {una pareja sin hijos y con dos sueldos} one {una pareja con un hijo y dos sueldos} other {una pareja con {words} hijos y dos sueldos}} |  |
| `places.pastAxis` | past the axis | más allá del eje |  |
| `places.figure.sub` | Every figure on it is {household}, renting in the state's most populous county. | Cada cifra del mapa es {household}, que renta en el condado más poblado del estado. |  |
| `places.figure.description` | A grid of the fifty states and the District of Columbia, each a square in roughly its geographic position, shaded by the selected measure. Each square is a button that opens that state's numbers under the map. Every value is written out under “Every state, every measure” below. | Una cuadrícula de los cincuenta estados y el Distrito de Columbia, cada uno un cuadro en aproximadamente su posición geográfica, sombreado según la medida seleccionada. Cada cuadro es un botón que abre las cifras de ese estado debajo del mapa. Cada valor aparece escrito en «Cada estado, cada medida», más abajo. |  |
| `places.figure.tile.value` | {state}: {value} | {state}: {value} |  |
| `places.figure.tile.none` | {state}: no cliff found | {state}: no se encontró precipicio |  |
| `places.figure.tile.past` | {state}: past the axis | {state}: más allá del eje |  |
| `places.figure.tile.incomplete` | {state}: {programs} not modelled — figures incomplete | {state}: {programs} no modelado — cifras incompletas |  |
| `places.figure.tile.roadNone` | {state}: no cliff on the road out of poverty | {state}: sin precipicios en el camino para salir de la pobreza |  |
| `places.figure.tile.roadPast` | {state}: the road runs off the axis | {state}: el camino queda fuera del eje |  |
| `places.figure.tile.leapAtLeast` | {state}: at least {value} — the exact size runs past the axis | {state}: al menos {value} — el tamaño exacto se sale del eje |  |
| `places.figure.legend.none` | No cliff found ({n}) | No se encontró precipicio ({n}) |  |
| `places.figure.legend.past` | Runs past the top of the axis ({n}) | Se sale por el tope del eje ({n}) |  |
| `places.figure.legend.incomplete` | {programs} not modelled — figures incomplete, not low ({n}) | {programs} no modelado — cifras incompletas, no bajas ({n}) |  |
| `places.figure.legend.roadNone` | No cliff on the road out of poverty ({n}) | Sin precipicios en el camino para salir de la pobreza ({n}) |  |
| `places.figure.legend.roadPast` | Road runs off the axis ({n}) | El camino queda fuera del eje ({n}) |  |
| `places.figure.bins.steps` | five equal-width steps from {lo} to {hi} | cinco escalones de igual ancho de {lo} a {hi} |  |
| `places.figure.bins.classes` | {n, plural, one {{words} class from {lo} to {hi}} other {{words} classes from {lo} to {hi}}} | {n, plural, one {{words} clase de {lo} a {hi}} other {{words} clases de {lo} a {hi}}} |  |
| `places.figure.bins.diverging` | {down} steps of {downWidth} below zero and {up} of {upWidth} above it, from {lo} to {hi} | {down} pasos de {downWidth} por debajo de cero y {up} de {upWidth} por encima, de {lo} a {hi} |  |
| `places.figure.bins.divergingOneSide` | {n} steps of {width} from zero, from {lo} to {hi} | {n} pasos de {width} desde cero, de {lo} a {hi} |  |
| `places.figure.source` | Estimates only. PolicyEngine {year} rules, run of {date}. | Solo estimaciones. Reglas de {year} de PolicyEngine, corrida del {date}. |  |
| `places.figure.binsLine.plain` | Bins: {bins} over the {comparable} states with a comparable figure. | Rangos: {bins} sobre los {comparable} estados con una cifra comparable. |  |
| `places.figure.binsLine.none` | Bins: {bins} over the {comparable} states with a comparable figure; {none} with no cliff found. | Rangos: {bins} sobre los {comparable} estados con una cifra comparable; {none} sin precipicio encontrado. |  |
| `places.figure.binsLine.past` | Bins: {bins} over the {comparable} states with a comparable figure; {past} past the axis. | Rangos: {bins} sobre los {comparable} estados con una cifra comparable; {past} más allá del eje. |  |
| `places.figure.binsLine.nonePast` | Bins: {bins} over the {comparable} states with a comparable figure; {none} with no cliff found; {past} past the axis. | Rangos: {bins} sobre los {comparable} estados con una cifra comparable; {none} sin precipicio encontrado; {past} más allá del eje. |  |
| `places.figure.hatched` | {n, plural, one {{m, plural, one {One state is hatched: {programs} is not modelled there, so its figures are incomplete and are not shaded or ranked.} other {One state is hatched: {programs} are not modelled there, so its figures are incomplete and are not shaded or ranked.}}} other {{m, plural, one {{n} states are hatched: {programs} is not modelled there, so their figures are incomplete and are not shaded or ranked.} other {{n} states are hatched: {programs} are not modelled there, so their figures are incomplete and are not shaded or ranked.}}}} | {n, plural, one {{m, plural, one {Un estado está rayado: {programs} no está modelado ahí, así que sus cifras son incompletas y no se sombrean ni se clasifican.} other {Un estado está rayado: {programs} no están modelados ahí, así que sus cifras son incompletas y no se sombrean ni se clasifican.}}} other {{m, plural, one {{n} estados están rayados: {programs} no está modelado ahí, así que sus cifras son incompletas y no se sombrean ni se clasifican.} other {{n} estados están rayados: {programs} no están modelados ahí, así que sus cifras son incompletas y no se sombrean ni se clasifican.}}}} |  |
| `places.figure.oneClass.countNone` | {n} of the {total} comparable states have none. | {n} de los {total} estados comparables no tienen ninguno. |  |
| `places.figure.oneClass.countValue` | {n} of the {total} comparable states have {value}. | {n} de los {total} estados comparables tienen {value}. |  |
| `places.figure.oneClass.countRange` | {n} of the {total} comparable states have {lo} to {hi}. | {n} de los {total} estados comparables tienen de {lo} a {hi}. |  |
| `places.figure.oneClass.dollars` | {n} of the {total} comparable states fall between {lo} and {hi}. | {n} de los {total} estados comparables quedan entre {lo} y {hi}. |  |
| `places.figure.title` | {measure}, state by state | {measure}, estado por estado |  |
| `places.readout.empty` | Select a state to read its numbers. | Seleccione un estado para leer sus cifras. |  |
| `places.readout.step` | {n, plural, one {{state} — {loss} lost at {step}, when {programs} ends.} other {{state} — {loss} lost at {step}, when {programs} end.} =0 {{state} — {loss} lost at {step}; no single program explains the drop.}} | {n, plural, one {{state} — {loss} perdidos en {step}, cuando termina {programs}.} other {{state} — {loss} perdidos en {step}, cuando terminan {programs}.} =0 {{state} — {loss} perdidos en {step}; ningún programa por sí solo explica la caída.}} |  |
| `places.readout.floor` | {n, plural, one {{m, plural, one {{state} — at least {loss} lost at {step}, when {programs} ends; a floor, because {missing} is not modelled.} other {{state} — at least {loss} lost at {step}, when {programs} ends; a floor, because {missing} are not modelled.}}} other {{m, plural, one {{state} — at least {loss} lost at {step}, when {programs} end; a floor, because {missing} is not modelled.} other {{state} — at least {loss} lost at {step}, when {programs} end; a floor, because {missing} are not modelled.}}} =0 {{m, plural, one {{state} — at least {loss} lost at {step}; a floor, because {missing} is not modelled.} other {{state} — at least {loss} lost at {step}; a floor, because {missing} are not modelled.}}}} | {n, plural, one {{m, plural, one {{state} — al menos {loss} perdidos en {step}, cuando termina {programs}; un piso, porque {missing} no está modelado.} other {{state} — al menos {loss} perdidos en {step}, cuando termina {programs}; un piso, porque {missing} no están modelados.}}} other {{m, plural, one {{state} — al menos {loss} perdidos en {step}, cuando terminan {programs}; un piso, porque {missing} no está modelado.} other {{state} — al menos {loss} perdidos en {step}, cuando terminan {programs}; un piso, porque {missing} no están modelados.}}} =0 {{m, plural, one {{state} — al menos {loss} perdidos en {step}; un piso, porque {missing} no está modelado.} other {{state} — al menos {loss} perdidos en {step}; un piso, porque {missing} no están modelados.}}}} |  |
| `places.readout.worstStep` | {n, plural, one {Largest single loss anywhere on the curve: {loss} at {step}, when {programs} ends.} other {Largest single loss anywhere on the curve: {loss} at {step}, when {programs} end.} =0 {Largest single loss anywhere on the curve: {loss} at {step}; no single program explains the drop.}} | {n, plural, one {Mayor pérdida en un solo escalón de toda la curva: {loss} en {step}, cuando termina {programs}.} other {Mayor pérdida en un solo escalón de toda la curva: {loss} en {step}, cuando terminan {programs}.} =0 {Mayor pérdida en un solo escalón de toda la curva: {loss} en {step}; ningún programa por sí solo explica la caída.}} |  |
| `places.readout.worstStepFloor` | {n, plural, one {{m, plural, one {Largest single loss anywhere on the curve: at least {loss} at {step}, when {programs} ends; a floor, because {missing} is not modelled.} other {Largest single loss anywhere on the curve: at least {loss} at {step}, when {programs} ends; a floor, because {missing} are not modelled.}}} other {{m, plural, one {Largest single loss anywhere on the curve: at least {loss} at {step}, when {programs} end; a floor, because {missing} is not modelled.} other {Largest single loss anywhere on the curve: at least {loss} at {step}, when {programs} end; a floor, because {missing} are not modelled.}}} =0 {{m, plural, one {Largest single loss anywhere on the curve: at least {loss} at {step}; a floor, because {missing} is not modelled.} other {Largest single loss anywhere on the curve: at least {loss} at {step}; a floor, because {missing} are not modelled.}}}} | {n, plural, one {{m, plural, one {Mayor pérdida en un solo escalón de toda la curva: al menos {loss} en {step}, cuando termina {programs}; un piso, porque {missing} no está modelado.} other {Mayor pérdida en un solo escalón de toda la curva: al menos {loss} en {step}, cuando termina {programs}; un piso, porque {missing} no están modelados.}}} other {{m, plural, one {Mayor pérdida en un solo escalón de toda la curva: al menos {loss} en {step}, cuando terminan {programs}; un piso, porque {missing} no está modelado.} other {Mayor pérdida en un solo escalón de toda la curva: al menos {loss} en {step}, cuando terminan {programs}; un piso, porque {missing} no están modelados.}}} =0 {{m, plural, one {Mayor pérdida en un solo escalón de toda la curva: al menos {loss} en {step}; un piso, porque {missing} no está modelado.} other {Mayor pérdida en un solo escalón de toda la curva: al menos {loss} en {step}; un piso, porque {missing} no están modelados.}}}} |  |
| `places.readout.measure.dangerWidth` | {state} — {width} of earnings lie inside danger zones. | {state} — {width} de ingresos quedan dentro de zonas de peligro. |  |
| `places.readout.measure.dangerWidthOpen` | {state} — at least {width} of earnings lie inside danger zones; the last one had not closed by {top}, the top of the axis. | {state} — al menos {width} de ingresos quedan dentro de zonas de peligro; la última no se había cerrado en {top}, el tope del eje. |  |
| `places.readout.measure.leap` | {state} — a raise of {leap} clears the worst danger zone. | {state} — un aumento de {leap} sale de la peor zona de peligro. |  |
| `places.readout.measure.leapAtLeast` | {state} — a raise of at least {leap} to clear the worst danger zone, which runs past {top}, the top of the axis. | {state} — un aumento de al menos {leap} para salir de la peor zona de peligro, que se extiende más allá de {top}, el tope del eje. |  |
| `places.readout.measure.safeExit` | {state} — no danger zone left above {exit}. | {state} — no queda ninguna zona de peligro por encima de {exit}. |  |
| `places.readout.measure.safeExitPast` | {state} — no safe exit found: the last danger zone had not closed by {top}, the top of the axis. | {state} — no se encontró salida segura: la última zona de peligro no se había cerrado en {top}, el tope del eje. |  |
| `places.readout.measure.cliffCount` | {n, plural, one {{deferred, plural, =0 {{state} — 1 cliff on this household's curve, none deferred.} other {{state} — 1 cliff on this household's curve, and {deferred} more deferred to a later renewal.}}} other {{deferred, plural, =0 {{state} — {n} cliffs on this household's curve, none deferred.} other {{state} — {n} cliffs on this household's curve, and {deferred} more deferred to a later renewal.}}}} | {n, plural, one {{deferred, plural, =0 {{state} — 1 precipicio en la curva de este hogar, ninguno diferido.} other {{state} — 1 precipicio en la curva de este hogar, y {deferred} más diferidos a una renovación posterior.}}} other {{deferred, plural, =0 {{state} — {n} precipicios en la curva de este hogar, ninguno diferido.} other {{state} — {n} precipicios en la curva de este hogar, y {deferred} más diferidos a una renovación posterior.}}}} |  |
| `places.readout.measure.deferred` | {deferred, plural, =0 {{n, plural, one {{state} — no cliff deferred to a later renewal; its one cliff lands with the raise.} other {{state} — no cliff deferred to a later renewal; all {n} land with the raise.}}} one {{n, plural, one {{state} — 1 cliff deferred to a later renewal, on top of {n} that lands with the raise.} other {{state} — 1 cliff deferred to a later renewal, on top of {n} that land with the raise.}}} other {{n, plural, one {{state} — {deferred} cliffs deferred to a later renewal, on top of {n} that lands with the raise.} other {{state} — {deferred} cliffs deferred to a later renewal, on top of {n} that land with the raise.}}}} | {deferred, plural, =0 {{n, plural, one {{state} — ningún precipicio diferido a una renovación posterior; su único precipicio cae con el aumento.} other {{state} — ningún precipicio diferido a una renovación posterior; los {n} caen con el aumento.}}} one {{n, plural, one {{state} — 1 precipicio diferido a una renovación posterior, además de {n} que cae con el aumento.} other {{state} — 1 precipicio diferido a una renovación posterior, además de {n} que caen con el aumento.}}} other {{n, plural, one {{state} — {deferred} precipicios diferidos a una renovación posterior, además de {n} que cae con el aumento.} other {{state} — {deferred} precipicios diferidos a una renovación posterior, además de {n} que caen con el aumento.}}}} |  |
| `places.readout.measure.floorTail` | {n, plural, one {Incomplete: {missing} is not modelled, so the figure is a floor.} other {Incomplete: {missing} are not modelled, so the figure is a floor.}} | {n, plural, one {Incompleto: {missing} no está modelado, así que la cifra es un piso.} other {Incompleto: {missing} no están modelados, así que la cifra es un piso.}} |  |
| `places.readout.measure.roadCliffCount` | {n, plural, one {{state} — 1 cliff on the road out of poverty.} other {{state} — {n} cliffs on the road out of poverty.}} | {n, plural, one {{state} — 1 precipicio en el camino para salir de la pobreza.} other {{state} — {n} precipicios en el camino para salir de la pobreza.}} |  |
| `places.readout.none` | {state} — no cliff found: no {step} step of earnings on this household's curve cut net income by {floor} or more, up to {top}. | {state} — no se encontró precipicio: ningún escalón de {step} de ingresos en la curva de este hogar recortó el ingreso neto en {floor} o más, hasta {top}. |  |
| `places.readout.noneDeferred` | {deferred, plural, one {{state} — no cliff lands with the raise: no {step} step of earnings on this household's curve cut net income by {floor} or more in the year of the raise, up to {top}; 1 cliff is deferred to a later renewal.} other {{state} — no cliff lands with the raise: no {step} step of earnings on this household's curve cut net income by {floor} or more in the year of the raise, up to {top}; {deferred} cliffs are deferred to a later renewal.}} | {deferred, plural, one {{state} — ningún precipicio cae con el aumento: ningún escalón de {step} de ingresos en la curva de este hogar recortó el ingreso neto en {floor} o más en el año del aumento, hasta {top}; 1 precipicio está diferido a una renovación posterior.} other {{state} — ningún precipicio cae con el aumento: ningún escalón de {step} de ingresos en la curva de este hogar recortó el ingreso neto en {floor} o más en el año del aumento, hasta {top}; {deferred} precipicios están diferidos a una renovación posterior.}} |  |
| `places.readout.road.holds` | The road does not collapse: no {step} step of earnings between {lo} and {hi} cut net income by {floor} or more. | El camino no se derrumba: ningún escalón de {step} de ingresos entre {lo} y {hi} recortó el ingreso neto en {floor} o más. |  |
| `places.readout.road.collapseNoProgram` | The road collapses at {at}, where the family loses {drop} in one step; no single program explains the drop. | El camino se derrumba en {at}, donde la familia pierde {drop} de un solo paso; ningún programa por sí solo explica la caída. |  |
| `places.readout.road.position` | {n} in 100 families like this earn less than that. | {n} de cada 100 familias como esta ganan menos que eso. |  |
| `places.readout.road.offAxis` | {state} — this household's road out of poverty, from the poverty line to twice it, falls outside the earnings this state was swept over, so it has no keep rate. | {state} — el camino de este hogar para salir de la pobreza, de la línea de pobreza al doble de esa línea, queda fuera de los ingresos que se recorrieron en este estado, así que no tiene una cifra que comparar. |  |
| `places.readout.road.collapsePlural` | The road collapses at {at}, where {programs} end and the family loses {drop} in one step. | El camino se derrumba en {at}, donde terminan {programs} y la familia pierde {drop} de un solo paso. |  |
| `places.readout.road.rate` | {state} — {rate} climbing out of poverty. | {state} — {rate} al salir de la pobreza. |  |
| `places.readout.axisPosition` | {n} in 100 families like this earn less than that. | {n} de cada 100 familias como esta ganan menos que eso. |  |
| `places.readout.axisSameAsRoad` | That collapse is also the largest single loss anywhere on the curve. | Ese derrumbe es también la mayor pérdida en un solo escalón de toda la curva. |  |
| `places.readout.carePrice` | There is no county child-care price for {state} in the source database, so a {care} stands in — and child care is what ends at most of these cliffs. | No hay un precio de cuidado infantil por condado para {state} en la base de datos de origen, así que se usa {care} en su lugar, y el cuidado infantil es lo que termina en la mayoría de estos precipicios. |  |
| `places.rank.row.plain` | {rank} {state}: {value} | {rank} {state}: {value} |  |
| `places.rank.row.withAt` | {rank} {state}: {value}, {at} | {rank} {state}: {value}, {at} |  |
| `places.rank.at` | at {value} | en {value} |  |
| `places.rank.ordinal` | {n}. | {n}. |  |
| `places.rank.range` | {n, plural, one {1.} other {1–{n}}} | {n, plural, one {1.} other {1–{n}}} |  |
| `places.rank.floor` | {value} (floor) | {value} (piso) |  |
| `places.rank.atLeast` | ≥ {value} | ≥ {value} |  |
| `places.rank.step` | {from} → {to} | {from} → {to} |  |
| `places.rank.lower.leap` | {n, plural, one {Rank 1 — at least this much; the exact size runs past the axis (1)} other {Ranks 1–{n} shared — at least this much; the exact size runs past the axis ({n})}} | {n, plural, one {Puesto 1 — al menos esto; el tamaño exacto se sale del eje (1)} other {Puestos 1–{n} compartidos — al menos esto; el tamaño exacto se sale del eje ({n})}} |  |
| `places.rank.lower.safeExit` | {n, plural, one {Rank 1 — past the top of the axis; no safe exit found on the scale (1)} other {Ranks 1–{n} shared — past the top of the axis; no safe exit found on the scale ({n})}} | {n, plural, one {Puesto 1 — más allá del tope del eje; no se encontró salida segura en la escala (1)} other {Puestos 1–{n} compartidos — más allá del tope del eje; no se encontró salida segura en la escala ({n})}} |  |
| `places.rank.lower.note.leap` | {n, plural, one {This state could need the largest raise — the axis ends before the worst zone closes — so it takes the top rank.} other {Any of these could need the largest raise — the axis ends before the worst zone closes — so they share the top ranks the way a tie does.}} | {n, plural, one {Este estado podría necesitar el mayor aumento (el eje termina antes de que se cierre la peor zona), así que ocupa el primer puesto.} other {Cualquiera de estos podría necesitar el mayor aumento (el eje termina antes de que se cierre la peor zona), así que comparten los primeros puestos como en un empate.}} |  |
| `places.rank.lower.note.leapTop.reaches` | The largest measured leap is {topState}'s {topValue}; {floorState}'s is at least as large. | El mayor salto medido es el de {topState}, de {topValue}; el de {floorState} es al menos igual de grande. |  |
| `places.rank.lower.note.leapTop.larger` | The largest measured leap is {topState}'s {topValue}; {floorState}'s is at least {floorValue} and may be larger. | El mayor salto medido es el de {topState}, de {topValue}; el de {floorState} es de al menos {floorValue} y puede ser mayor. |  |
| `places.rank.lower.note.safeExit` | {n, plural, one {This state had not closed its last danger zone by the top of the axis, so it takes the top rank.} other {None of these had closed the last danger zone by the top of the axis, so any could be the highest; they share the top ranks the way a tie does.}} | {n, plural, one {Este estado no había cerrado su última zona de peligro al tope del eje, así que ocupa el primer puesto.} other {Ninguno de estos había cerrado la última zona de peligro al tope del eje, así que cualquiera podría ser el más alto; comparten los primeros puestos como en un empate.}} |  |
| `places.rank.lower.note.safeExitTop` | The highest measured safe exit is {topState}'s {topValue}. | La salida segura medida más alta es la de {topState}, de {topValue}. |  |
| `places.rank.lower.note.road` | {n, plural, one {This household's road out of poverty falls outside the earnings this state was swept over, so it has no keep rate to compare.} other {These households' road out of poverty falls outside the earnings these states were swept over, so they have no keep rate to compare.}} | {n, plural, one {El camino de este hogar para salir de la pobreza queda fuera de los ingresos que se recorrieron en este estado, así que no tiene una cifra que comparar.} other {El camino de estos hogares para salir de la pobreza queda fuera de los ingresos que se recorrieron en estos estados, así que no tienen una cifra que comparar.}} |  |
| `places.rank.lower.road` | {n, plural, one {The road runs off the axis (1)} other {The road runs off the axis ({n})}} | {n, plural, one {El camino queda fuera del eje (1)} other {El camino queda fuera del eje ({n})}} |  |
| `places.rank.none.heading` | No cliff found ({n}) | No se encontró precipicio ({n}) |  |
| `places.rank.none.value` | no cliff | sin precipicio |  |
| `places.rank.none.note` | No step down of {floor} or more anywhere on this household's curve. A measurement of zero, not the smallest loss: these states are left out of the bins. | Ningún escalón hacia abajo de {floor} o más en toda la curva de este hogar. Una medición de cero, no la pérdida más pequeña: estos estados quedan fuera de los rangos. |  |
| `places.rank.none.roadHeading` | No cliff on the road out of poverty ({n}) | Sin precipicios en el camino para salir de la pobreza ({n}) |  |
| `places.rank.none.roadValue` | no cliff on the road | sin precipicios en el camino |  |
| `places.rank.none.roadNote` | No step down of {floor} or more between the poverty line and twice the poverty line. A measurement of zero, not the smallest loss: these states are left out of the bins. | Ningún escalón hacia abajo de {floor} o más entre la línea de pobreza y el doble de esa línea. Una medición de cero, no la pérdida más pequeña: estos estados quedan fuera de los rangos. |  |
| `places.rank.incomplete.heading` | Not ranked — figures incomplete ({n}) | Sin clasificar — cifras incompletas ({n}) |  |
| `places.rank.incomplete.value` | not comparable | no comparable |  |
| `places.rank.incomplete.note` | {n, plural, one {{m, plural, one {{programs} is not modelled here, so a real cliff may be missing from this curve. This is not a low state; it is an unmeasured one.} other {{programs} are not modelled here, so a real cliff may be missing from this curve. This is not a low state; it is an unmeasured one.}}} other {{m, plural, one {{programs} is not modelled here, so a real cliff may be missing from these curves. They are not low states; they are unmeasured ones.} other {{programs} are not modelled here, so a real cliff may be missing from these curves. They are not low states; they are unmeasured ones.}}}} | {n, plural, one {{m, plural, one {{programs} no está modelado aquí, así que a esta curva podría faltarle un precipicio real. No es un estado bajo; es un estado sin medir.} other {{programs} no están modelados aquí, así que a esta curva podría faltarle un precipicio real. No es un estado bajo; es un estado sin medir.}}} other {{m, plural, one {{programs} no está modelado aquí, así que a estas curvas podría faltarles un precipicio real. No son estados bajos; son estados sin medir.} other {{programs} no están modelados aquí, así que a estas curvas podría faltarles un precipicio real. No son estados bajos; son estados sin medir.}}}} |  |
| `places.rank.bins` | Bins are recomputed for every measure — equal-width steps of a dollar measure, classes of whole numbers for a count — so a shade means nothing across two different measures. Read the bin bounds, not the colour. | Los rangos se recalculan para cada medida (escalones de igual ancho para una medida en dólares, clases de números enteros para un conteo), así que un tono no significa nada entre dos medidas distintas. Lea los límites del rango, no el color. |  |
| `places.rank.position` | {n} in 100 earn less | {n} de cada 100 ganan menos |  |
| `places.rank.headingBy` | Ranked: {order} | Clasificación: {order} |  |
| `places.table.heading` | All {n}, every measure | Los {n}, todas las medidas |  |
| `places.table.order.label` | Table order | Orden de la tabla |  |
| `places.table.order.state` | State, A to Z | Estado, de la A a la Z |  |
| `places.table.order.measure.dollars` | {title}, largest first | {title}, de mayor a menor |  |
| `places.table.order.measure.count` | {title}, most first | {title}, de más a menos |  |
| `places.table.order.measure.cents` | {title}, most regressive first | {title}, de más regresivo a menos |  |
| `places.table.order.hint` | Orders this table only; the map and the ranking follow the Measure above. | Ordena solo esta tabla; el mapa y la clasificación siguen la medida de arriba. |  |
| `places.table.caption` | Every measure for {household}, {order}. PolicyEngine {year} rules, run of {date}. | Todas las medidas para {household}, {order}. Reglas de PolicyEngine de {year}, corrida del {date}. |  |
| `places.table.byState` | by state | por estado |  |
| `places.table.byMeasure.dollars` | by {title}, largest first | por {title}, de mayor a menor |  |
| `places.table.byMeasure.count` | by {title}, most first | por {title}, de más a menos |  |
| `places.table.byMeasure.cents` | by {title}, most regressive first | por {title}, de más regresivo a menos |  |
| `places.table.cols.state` | State | Estado |  |
| `places.table.cols.biggestLoss` | Largest one-step loss | Mayor pérdida en un escalón |  |
| `places.table.cols.biggestLossAt` | Worst step | Peor escalón |  |
| `places.table.cols.dangerWidth` | Danger zones, total width | Zonas de peligro, ancho total |  |
| `places.table.cols.leap` | The leap | El salto |  |
| `places.table.cols.safeExit` | Safe exit | Salida segura |  |
| `places.table.cols.cliffCount` | Cliffs anywhere | Precipicios en toda la curva |  |
| `places.table.cols.deferredCliffCount` | Deferred | Diferidos |  |
| `places.table.cols.figures` | Figures | Cifras |  |
| `places.table.cols.keepRate` | Keep rate | Lo que se queda de cada dólar |  |
| `places.table.cols.roadCliffCount` | Cliffs on the road | Precipicios en el camino |  |
| `places.table.cols.roadWorst` | Road's worst loss | Mayor pérdida del camino |  |
| `places.table.cols.roadWorstAt` | Road's worst step | Peor escalón del camino |  |
| `places.table.defs.label` | What the columns mean | Qué significan las columnas |  |
| `places.table.defs.biggestLossAt` | The $1,000 step of earnings at which the largest one-step loss lands. | El escalón de $1,000 de ingresos en el que cae la mayor pérdida en un escalón. |  |
| `places.table.defs.figures` | Complete, or the program the model cannot compute in that state, which makes the row's figures floors; and whether HotGap added the child-care subsidy to net income, where PolicyEngine had left it out. | Completas, o el programa que el modelo no puede calcular en ese estado, lo que convierte las cifras de la fila en pisos; y si HotGap agregó el subsidio de cuidado infantil al ingreso neto, donde PolicyEngine lo había dejado fuera. |  |
| `places.table.defs.roadWorstAt` | The $1,000 step of earnings at which the road's largest single loss lands. | El escalón de $1,000 de ingresos en el que cae la mayor pérdida del camino. |  |
| `places.table.defs.position` | Of families like this one in that state, how many in 100 earn less than the figure beside it. From Census survey data, and cross-sectional: how many families already earn less, never one family's chance of getting there. | De las familias como esta en ese estado, cuántas de cada 100 ganan menos que la cifra de al lado. De datos de encuesta del Censo, y de corte transversal: cuántas familias ya ganan menos, nunca la probabilidad de que una familia llegue ahí. |  |
| `places.table.defs.positionTerm` | Families earning less | Familias que ganan menos |  |
| `places.table.defs.pastAxisTerm` | past the axis | más allá del eje |  |
| `places.table.defs.pastAxis` | The figure runs off the top of the earnings scale, so the state has a bound and not a value. Never chart it as one. | La cifra se sale del tope de la escala de ingresos, así que el estado tiene un límite y no un valor. Nunca la grafique como un valor. |  |
| `places.table.defs.lowerBoundTerm` | ≥ a figure | ≥ una cifra |  |
| `places.table.defs.lowerBound` | A figure the scale bounds from below: the real one is this or larger, and the earnings scale ended before it could be measured. | Una cifra que la escala acota por debajo: la real es esa o mayor, y la escala de ingresos terminó antes de poder medirla. |  |
| `places.table.none` | none | ninguno |  |
| `places.table.complete` | complete | completas |  |
| `places.table.floor` | floor: {programs} not modelled | piso: {programs} no modelado |  |
| `places.table.subsidyAdded` | child-care subsidy added by HotGap | subsidio de cuidado infantil agregado por HotGap |  |
| `places.table.floorMark` | floor | piso |  |
| `places.table.swipe` | Swipe for more → | Deslice para ver más → |  |
| `places.table.note` | Every row keeps the number the model returned, including the rows it cannot complete, because a reporter needs to see what came back. Those rows are flagged in the last column and are not shaded on the map or placed in the ranking. Select a state on the map or in this table to read the corrections behind its numbers under the map; the arrow keys move between states and Enter selects. | Cada fila conserva el número que devolvió el modelo, incluidas las filas que no puede completar, porque un reportero necesita ver lo que salió. Esas filas están marcadas en la última columna y no se sombrean en el mapa ni entran en la clasificación. Seleccione un estado en el mapa o en esta tabla para leer las correcciones detrás de sus números debajo del mapa; las flechas se mueven entre estados y Enter selecciona. |  |
| `places.table.position` | {n} in 100 | {n} de cada 100 |  |
| `places.table.carePrice` | child-care price: {care} | precio del cuidado de niños: {care} |  |
| `places.detail.heading` | Corrections applied in {state} ({n}) | Correcciones aplicadas en {state} ({n}) |  |
| `places.detail.applied` | applied | aplicada |  |
| `places.detail.noBlock` | This run recorded no coverage block for this state. | Esta corrida no registró un bloque de cobertura para este estado. |  |
| `places.detail.changed` | What HotGap changed on top of PolicyEngine before any figure for {state} was read. | Lo que HotGap cambió sobre PolicyEngine antes de leer cualquier cifra de {state}. |  |
| `places.detail.unchanged` | PolicyEngine's own figures for {state} stand as served; HotGap changed nothing on top of them — the fixes other states need were not needed here. | Las cifras propias de PolicyEngine para {state} se mantienen tal como se sirvieron; HotGap no cambió nada sobre ellas: los arreglos que otros estados necesitan no hicieron falta aquí. |  |
| `places.detail.subsidy.added` | Child-care subsidy: added by HotGap for {state}. | Subsidio de cuidado infantil: agregado por HotGap para {state}. |  |
| `places.detail.subsidy.inNetIncome` | Child-care subsidy: inside PolicyEngine's net income for {state}. | Subsidio de cuidado infantil: dentro del ingreso neto de PolicyEngine para {state}. |  |
| `places.detail.unmodeled` | Not modelled in {state} ({n}) | No modelado en {state} ({n}) |  |
| `places.detail.incompleteTag` | figures incomplete | cifras incompletas |  |
| `places.detail.other` | Also in {state}'s net income ({n}) | También en el ingreso neto de {state} ({n}) |  |
| `places.detail.otherNote` | Up to {max} a year on this run. | Hasta {max} al año en esta corrida. |  |
| `places.detail.variable` | PolicyEngine variable: {name} | Variable de PolicyEngine: {name} |  |
| `places.detail.liheap.program` | Energy assistance (LIHEAP) | Asistencia energética (LIHEAP) |  |
| `places.detail.liheap.footing.boundary` | not counted | no contada |  |
| `places.detail.liheap.footing.inNetIncome` | in net income | en el ingreso neto |  |
| `places.detail.liheap.limit` | Stops at {limit}, the heating limit for {vintage}. | Se detiene en {limit}, el límite de calefacción para {vintage}. |  |
| `places.detail.liheap.worth.unread` | The state's matrix prints no amount at that band. | La matriz del estado no imprime ningún monto en esa banda. |  |
| `places.detail.liheap.worth.flatTaper` | Worth {lo} a winter if received; the amount tapers toward the limit. | Vale {lo} por invierno si se recibe; el monto se reduce gradualmente hacia el límite. |  |
| `places.detail.liheap.worth.flatNotch` | Worth {lo} a winter if received, flat to the limit. | Vale {lo} por invierno si se recibe, sin cambios hasta el límite. |  |
| `places.detail.liheap.worth.flatOther` | Worth {lo} a winter if received, at that top income band. | Vale {lo} por invierno si se recibe, en esa banda superior de ingresos. |  |
| `places.detail.liheap.worth.rangeTaper` | Worth {lo} to {hi} a winter if received; the amount tapers toward the limit. | Vale de {lo} a {hi} por invierno si se recibe; el monto se reduce gradualmente hacia el límite. |  |
| `places.detail.liheap.worth.rangeNotch` | Worth {lo} to {hi} a winter if received, flat to the limit. | Vale de {lo} a {hi} por invierno si se recibe, sin cambios hasta el límite. |  |
| `places.detail.liheap.worth.rangeOther` | Worth {lo} to {hi} a winter if received, at that top income band. | Vale de {lo} a {hi} por invierno si se recibe, en esa banda superior de ingresos. |  |
| `places.detail.liheap.served.few` | Fewer than 1 in 10 income-eligible households were served in {vintage} ({pct}%). | Menos de 1 de cada 10 hogares elegibles por ingreso fueron atendidos en {vintage} ({pct}%). |  |
| `places.detail.liheap.served.some` | About {n} in 10 income-eligible households were served in {vintage} ({pct}%). | Unos {n} de cada 10 hogares elegibles por ingreso fueron atendidos en {vintage} ({pct}%). |  |
| `places.detail.liheap.served.most` | Almost all income-eligible households were served in {vintage} ({pct}%). | Casi todos los hogares elegibles por ingreso fueron atendidos en {vintage} ({pct}%). |  |
| `places.detail.liheap.served.unread` | The share of income-eligible households served is not published for {vintage}. | La proporción de hogares elegibles por ingreso atendidos no está publicada para {vintage}. |  |
| `places.detail.liheap.counted` | Paid as the {program}, which is counted in every figure for {state}. | Se paga como el {program}, que se cuenta en cada cifra de {state}. |  |
| `places.detail.liheap.cite.limitAndAmount` | Limit and amount: {host}. | Límite y monto: {host}. |  |
| `places.detail.liheap.cite.limit` | Limit: {host}. | Límite: {host}. |  |
| `places.detail.liheap.cite.amount` | Amount: {host}. | Monto: {host}. |  |
| `places.detail.liheap.cite.served` | Households served: {host}. | Hogares atendidos: {host}. |  |
| `places.detail.liheap.cite.readOn` | Read {readOn}. | Leído el {readOn}. |  |
| `places.detail.liheap.cite.link` | [{host}]({url}) | [{host}]({url}) |  |
| `places.detail.care.county` | county price | precio del condado |  |
| `places.detail.care.stateMedianCounty` | median of the state's other counties | mediana de los demás condados del estado |  |
| `places.detail.care.nationalMedian` | national median price | precio mediano nacional |  |
| `places.detail.care.unknown` | not recorded | no registrado |  |
| `places.detail.source` | Estimates only. Rules: {year}. Rent: {rentPublisher}; {rentVintage}. County: {county}. Child-care price: {care}, carried to {year} dollars by the BLS Employment Cost Index. Model: {model}. Weekly run of {date}. | Solo estimaciones. Reglas: {year}. Renta: {rentPublisher}; {rentVintage}. Condado: {county}. Precio del cuidado de niños: {care}, llevado a dólares de {year} con el Índice de Costo del Empleo del BLS. Modelo: {model}. Corrida semanal del {date}. |  |
| `places.detail.sourceCounty.named` | {county} (the state's most populous; {vintage}) | {county} (el más poblado del estado; {vintage}) |  |
| `places.detail.sourceCounty.unnamed` | the state's most populous, {vintage} | el más poblado del estado, {vintage} |  |
| `places.detail.sourceCare.dated` | {care}, {year} study | {care}, estudio de {year} |  |
| `places.detail.sourceCare.undated` | {care} | {care} |  |
| `places.detail.sourceReach` | Families earning less: {vintages}, grown to {year} dollars. | Familias que ganan menos: {vintages}, llevado a dólares de {year}. |  |
| `places.detail.wherefrom` | Where {state}'s numbers come from | De dónde vienen las cifras de {state} |  |
| `places.csv.subsidy.inNetIncome` | in PolicyEngine's net income | en el ingreso neto de PolicyEngine |  |
| `places.csv.subsidy.added` | added by HotGap | agregado por HotGap |  |
| `places.csv.modelLabel.hosted` | HotGap hosted engine, {model} | motor alojado de HotGap, {model} |  |
| `places.csv.modelLabel.publicApi` | PolicyEngine public API ({endpoint}) | API pública de PolicyEngine ({endpoint}) |  |
| `places.method.heading` | How these numbers were made | Cómo se hicieron estos números |  |
| `places.method.items.engine` | Every cell is one household shape run through [PolicyEngine](https://policyengine.org), an open-source tax-and-benefit calculator, at {year} rules, earnings varied in $1,000 steps from $0 past 400% of the poverty guideline for that household size, plus $40,000 of room to recover. | Cada celda es un tipo de hogar procesado con [PolicyEngine](https://policyengine.org), una calculadora de impuestos y beneficios de código abierto, con las reglas de {year}, variando los ingresos en escalones de $1,000 desde $0 hasta más allá del 400% de la guía de pobreza para ese tamaño de hogar, más $40,000 de margen para recuperarse. |  |
| `places.method.items.money` | The money line is **health-adjusted**: household net income minus what the household actually pays in health-insurance premiums, net of the marketplace subsidy. Deductibles and copays are not included. | La línea de dinero está **ajustada por salud**: el ingreso neto del hogar menos lo que el hogar realmente paga en primas de seguro de salud, netas del subsidio del mercado. No se incluyen deducibles ni copagos. |  |
| `places.method.items.household` | Each household is a typical renter in the state's most populous county — named under the map for the selected state — with HUD Fair Market Rent, Census county estimates, and the DOL National Database of Childcare Prices preschool price for that county, carried to {year} dollars by the BLS Employment Cost Index. The study year behind the price, and whether a state or national median stood in for a county the database lacks, differ by state and are printed in the source line under the map. | Cada hogar es un inquilino típico del condado más poblado del estado (nombrado debajo del mapa para el estado seleccionado), con la renta justa de mercado de HUD, las estimaciones de condado del Censo y el precio de preescolar de la Base de Datos Nacional de Precios de Cuidado Infantil del DOL para ese condado, llevado a dólares de {year} con el Índice de Costo del Empleo del BLS. El año del estudio detrás del precio, y si una mediana estatal o nacional reemplazó a un condado que la base de datos no tiene, varían por estado y se imprimen en la línea de fuente debajo del mapa. |  |
| `places.method.items.takeUp` | The CCDF child care subsidy is **on** for this run and off for a household's own lookup. Head Start and housing vouchers are off in both: they are rationed, and assuming a family holds one inflates its numbers. | El subsidio de cuidado infantil CCDF está **activado** en esta corrida y desactivado en la consulta de un hogar propio. Head Start y los vales de vivienda están desactivados en ambas: están racionados, y suponer que una familia tiene uno infla sus números. |  |
| `places.method.items.deferred` | Cliffs deferred to a future renewal — Head Start's program-year carry-over, a child's 12 months of continuous Medicaid or CHIP eligibility, a parent's Transitional Medical Assistance — are counted in every figure here like any other cliff, and named again in the *deferred* column. They are real losses; what the column says is which of them wait for a renewal rather than landing with the raise. | Los precipicios diferidos a una renovación posterior — la continuidad de Head Start hasta el fin del año del programa, los 12 meses de Medicaid o CHIP continuo de un niño, la Asistencia Médica de Transición de un padre — se cuentan en todas las cifras de aquí como cualquier otro precipicio, y se nombran otra vez en la columna *diferidos*. Son pérdidas reales; lo que dice la columna es cuáles de ellas esperan a una renovación en vez de caer con el aumento. |  |
| `places.method.items.corrections` | Where a state's figure needed a correction on top of PolicyEngine — a premium ladder applied locally, the child care subsidy added back into net income, a parent Medicaid limit taken from the state's handbook, a coverage-gap premium — it is listed under the map for the selected state, from the run's own coverage record, not from copy kept here. | Cuando la cifra de un estado necesitó una corrección sobre PolicyEngine (una escala de primas aplicada localmente, el subsidio de cuidado infantil devuelto al ingreso neto, un límite de Medicaid para padres tomado del manual del estado, una prima por brecha de cobertura), aparece debajo del mapa para el estado seleccionado, a partir del propio registro de cobertura de la corrida, no de un texto guardado aquí. |  |
| `places.method.items.download` | The download is the table's rows in the table's order, one per state, with these columns: {columns}. Empty dollar cells are a state with no cliff or a safe exit past the axis; the flags say which figures are floors or lower bounds. | La descarga son las filas de la tabla en el orden de la tabla, una por estado, con estas columnas: {columns}. Las celdas de dólares vacías son un estado sin precipicio o una salida segura más allá del eje; las banderas dicen qué cifras son pisos o cotas inferiores. |  |
| `places.method.items.road` | **The road out of poverty** is the earnings from the federal poverty guideline for this household's size to twice it — $26,650 to $53,300 for a family of three at {year} rules, and Alaska and Hawaii on their own higher guidelines. It is federal on purpose, so every state's road is the same road and what differs is how the state's rules treat a family walking it. Its top carries one $1,000 step of allowance, because a program limit sitting on the twice-poverty line lands in the step that starts at the first sampled point at or above it. | **El camino para salir de la pobreza** son los ingresos que van desde la guía federal de pobreza para el tamaño de este hogar hasta el doble de esa guía: de $26,650 a $53,300 para una familia de tres con las reglas de {year}, y Alaska y Hawái con sus propias guías más altas. Es federal a propósito, para que el camino sea el mismo en todos los estados y lo que cambie sea cómo tratan sus reglas a una familia que lo recorre. Su tope lleva un escalón de $1,000 de holgura, porque un límite de programa situado justo en la línea del doble de la pobreza cae en el escalón que empieza en el primer punto muestreado igual o superior a ella. |  |
| `places.method.items.keepRate` | **The keep rate** is what the household keeps of each extra dollar earned across that road: the change in net income divided by the change in pay. It is one minus the effective marginal tax rate, the measure the benefits-cliff literature reports, said in cents because that is how a person hears it. Below zero the family ends the climb poorer than it began. | **Lo que se queda de cada dólar** es lo que el hogar conserva de cada dólar extra ganado a lo largo de ese camino: el cambio en el ingreso neto dividido entre el cambio en el pago. Es uno menos la tasa impositiva marginal efectiva, la medida que reporta la literatura sobre precipicios de beneficios, dicha en centavos porque así es como la escucha una persona. Por debajo de cero, la familia termina el ascenso más pobre de lo que empezó. |  |
| `places.method.items.position` | **Families earning less** puts a dollar figure where families are: of households like this one in that state, the share earning less than it, from Census survey data ({vintages}) grown to {year} dollars. It is cross-sectional — how many families already earn less — and never one family's chance of reaching that pay. A cell the survey cannot support is left empty rather than filled with a zero. | **Familias que ganan menos** sitúa una cifra en dólares donde están las familias: de los hogares como este en ese estado, la proporción que gana menos que esa cifra, según datos de encuesta del Censo ({vintages}) llevados a dólares de {year}. Es de corte transversal —cuántas familias ya ganan menos— y nunca la probabilidad de que una familia llegue a ese pago. Una celda que la encuesta no puede sostener se deja vacía en lugar de llenarse con un cero. |  |
| `places.method.items.modeledFamily` | **Every figure is the modelled family**, not an average of real ones: a renter in the state's most populous county, with children in paid care where every parent works, claiming what the rules entitle them to. A real household with a different rent, a different care arrangement or a benefit it never applied for has a different curve. | **Cada cifra es la familia modelada**, no un promedio de familias reales: un inquilino del condado más poblado del estado, con los hijos en cuidado pagado cuando ambos padres trabajan, que reclama aquello a lo que las reglas le dan derecho. Un hogar real con otra renta, otro arreglo de cuidado o un beneficio que nunca solicitó tiene otra curva. |  |
| `places.method.items.groups` | **The measures are two questions.** *On the road out of poverty* asks what happens to a family climbing from the poverty line to twice it — where the families this tool is for actually are. *Anywhere on the curve* asks where the tallest wall in the state stands, whatever pay it stands at; for this household that wall sits above the median family's earnings in {n} states of {total}, which is why it is no longer the page's first answer. | **Las medidas son dos preguntas.** *En el camino para salir de la pobreza* pregunta qué le pasa a una familia que sube de la línea de pobreza al doble de esa línea, que es donde están las familias para las que existe esta herramienta. *En cualquier punto de la curva* pregunta dónde está el muro más alto del estado, sea cual sea el pago en el que esté; para este hogar ese muro queda por encima de los ingresos de la familia mediana en {n} estados de {total}, y por eso ya no es la primera respuesta de la página. |  |
| `places.method.axis.plain` | For {household} the axis runs from $0 to {top}; a figure that runs past the axis runs past that. | Para {household} el eje va de $0 a {top}; una cifra que se sale del eje se sale de eso. |  |
| `places.method.axis.exceptions` | For {household} the axis runs from $0 to {top} ({exceptions}); a figure that runs past the axis runs past that. | Para {household} el eje va de $0 a {top} ({exceptions}); una cifra que se sale del eje se sale de eso. |  |
| `places.method.exception` | {top} in {state} | {top} en {state} |  |
| `places.method.excludes.heading` | What the model does not include | Lo que el modelo no incluye |  |
| `places.method.excludes.inputs` | Immigration status, assets, and household members aged 65 or over are not inputs. | El estatus migratorio, los bienes y los miembros del hogar de 65 años o más no son entradas. |  |
| `places.method.excludes.alaskaHawaii` | Alaska and Hawaii marketplace subsidies are computed upstream against the 48-state poverty guideline rather than their own higher ones ([reported to PolicyEngine](https://github.com/PolicyEngine/policyengine-us/issues/9482 "policyengine-us #9482")). HotGap does not correct this, so both states' premium-driven figures are understated. | Los subsidios del mercado de Alaska y Hawái se calculan río arriba con la guía de pobreza de los 48 estados y no con las suyas, más altas ([reportado a PolicyEngine](https://github.com/PolicyEngine/policyengine-us/issues/9482 "policyengine-us #9482")). HotGap no corrige esto, así que las cifras impulsadas por primas de ambos estados están subestimadas. |  |
| `places.method.excludes.everywhere` | {program}, in every state: {note} | {program}, en todos los estados: {note} |  |
| `places.method.excludes.liheap.none` | Energy assistance (LIHEAP) is in no figure on this page. | La asistencia energética (LIHEAP) no está en ninguna cifra de esta página. |  |
| `places.method.excludes.liheap.counted` | Energy assistance (LIHEAP) is in no figure on this page, except in {states}, where it is paid as {programs} and counted. | La asistencia energética (LIHEAP) no está en ninguna cifra de esta página, salvo en {states}, donde se paga como {programs} y se cuenta. |  |
| `places.method.excludes.liheap.grant` | It is a block grant, not an entitlement: in {vintage} the states served between {loPct}% ({loState}) and {hiPct}% ({hiState}) of their income-eligible households, so a curve that assumed it would draw a benefit most eligible families never receive. Each state's block under the map says where it stops, what it pays there and the share served; the download carries the limit and the share. | Es una subvención en bloque, no un derecho: en {vintage} los estados atendieron entre el {loPct}% ({loState}) y el {hiPct}% ({hiState}) de sus hogares elegibles por ingreso, así que una curva que la supusiera dibujaría un beneficio que la mayoría de las familias elegibles nunca recibe. El bloque de cada estado debajo del mapa dice dónde se detiene, cuánto paga ahí y la proporción atendida; la descarga lleva el límite y la proporción. |  |
| `places.method.excludes.liheap.the` | the {program} | el {program} |  |
| `places.method.excludes.hatched` | A program the model cannot compute in a state is listed under the map for that state and hatches it on every measure it could move. For {household} today that is {where}. | Un programa que el modelo no puede calcular en un estado aparece debajo del mapa para ese estado y lo raya en cada medida que podría mover. Para {household} hoy eso es {where}. |  |
| `places.method.excludes.whereItem` | {programs} in {state} | {programs} en {state} |  |
| `places.method.excludes.nothing` | Nothing the model cannot compute would move this household's figures in any state, so no state is hatched for {household}. | Nada de lo que el modelo no puede calcular movería las cifras de este hogar en ningún estado, así que ningún estado está rayado para {household}. |  |
| `places.method.hatchCaution.some` | **Hatched is not low.** A program the model cannot compute in a state — today {programs} — is missing from every figure for it, so its numbers are floors, not measurements. Do not write that those states are gentler; the only honest claim is that this model cannot yet say. The flag is read from the run's own coverage record, not from a list kept here, so a state drops off it the day the engine starts modelling the program. | **Rayado no es bajo.** Un programa que el modelo no puede calcular en un estado (hoy {programs}) falta en cada cifra de ese estado, así que sus números son pisos, no mediciones. No escriba que esos estados son más benignos; la única afirmación honesta es que este modelo todavía no puede decirlo. La bandera se lee del propio registro de cobertura de la corrida, no de una lista guardada aquí, así que un estado sale de ella el día en que el motor empiece a modelar el programa. |  |
| `places.method.hatchCaution.none` | **Hatched is not low.** A program the model cannot compute in a state is missing from every figure for it, so its numbers are floors, not measurements. Do not write that those states are gentler; the only honest claim is that this model cannot yet say. The flag is read from the run's own coverage record, not from a list kept here, so a state drops off it the day the engine starts modelling the program. | **Rayado no es bajo.** Un programa que el modelo no puede calcular en un estado falta en cada cifra de ese estado, así que sus números son pisos, no mediciones. No escriba que esos estados son más benignos; la única afirmación honesta es que este modelo todavía no puede decirlo. La bandera se lee del propio registro de cobertura de la corrida, no de una lista guardada aquí, así que un estado sale de ella el día en que el motor empiece a modelar el programa. |  |
| `places.method.pastAxisCaution` | **Past the axis is not a number.** Where a state's *last* danger zone runs off the top of the axis rather than closing, the safe exit is unknown; the leap is a lower bound only when the *worst* zone is the one that runs off. The two can differ, so a state can show an exact leap and no safe exit. Those cells read *past the axis* here and must not be charted as a value. | **Más allá del eje no es un número.** Cuando la *última* zona de peligro de un estado se sale por el tope del eje en vez de cerrarse, la salida segura se desconoce; el salto es una cota inferior solo cuando la *peor* zona es la que se sale. Las dos pueden diferir, así que un estado puede mostrar un salto exacto y ninguna salida segura. Esas celdas dicen aquí *más allá del eje* y no deben graficarse como un valor. |  |
| `places.method.source` | Run of {date} on {model}. Licence: AGPL-3.0-only. Estimates only — a caseworker decides real benefits. | Corrida del {date} en {model}. Licencia: AGPL-3.0-only. Solo estimaciones: un trabajador social decide los beneficios reales. |  |
| `places.method.cite` | Cite as: HotGap, *What a raise costs, state by state*, {year} rules on PolicyEngine ({model}), run of {date}, {url}. | Cítese como: HotGap, *Lo que cuesta un aumento, estado por estado*, reglas de {year} en PolicyEngine ({model}), corrida del {date}, {url}. |  |
| `places.keep.short` | {sign, select, loses {loses {cents}¢} other {keeps {cents}¢}} | {sign, select, loses {pierde {cents}¢} other {se queda con {cents}¢}} |  |
| `places.keep.tick` | {cents, plural, =0 {0¢} other {{sign, select, loses {−{cents}¢} other {+{cents}¢}}}} | {cents, plural, =0 {0¢} other {{sign, select, loses {−{cents}¢} other {+{cents}¢}}}} |  |
| `places.keep.span` | {cents}¢ | {cents}¢ |  |
| `places.roadOffAxis` | road runs off the axis | el camino queda fuera del eje |  |
| `places.answer.places.withDc` | the {n} states and the District of Columbia | los {n} estados y el Distrito de Columbia |  |
| `places.answer.places.plain` | the {n} states | los {n} estados |  |
| `places.answer.keepRate.some` | In {bad} of {places}, {household} climbing from the poverty line to twice it ends up poorer than they started. | En {bad} de {places}, {household} que sube de la línea de pobreza al doble de esa línea termina con menos de lo que tenía al empezar. |  |
| `places.answer.keepRate.none` | Nowhere in {places} does {household} end the climb from poverty to twice poverty poorer than they started; the state that comes closest is {state}, which {value}. | En ninguno de {places} {household} termina ese ascenso más pobre de lo que empezó; el estado que más se acerca es {state}, que {value}. |  |
| `places.answer.keepRate.all` | In every one of {places}, {household} climbing from the poverty line to twice it ends up poorer than they started — worst of all is {state}, which {value}. | En todos {places}, {household} que sube de la línea de pobreza al doble de esa línea termina con menos de lo que tenía al empezar; el peor de todos es {state}, que {value}. |  |
| `places.answer.roadCliffCount.some` | {state} puts {n, plural, one {{count} cliff} other {{count} cliffs}} on the road out of poverty, more than anywhere else; of {places}, {miss, plural, =0 {every one has at least one} one {just one has none} other {{miss} have none}}. | {state} pone {n, plural, one {{count} precipicio} other {{count} precipicios}} en el camino para salir de la pobreza, más que ningún otro estado; de {places}, {miss, plural, =0 {todos tienen al menos uno} one {solo uno no tiene ninguno} other {{miss} no tienen ninguno}}. |  |
| `places.answer.roadCliffCount.none` | Nothing on the road out of poverty costs this household {floor} in a single step, in any of {places}. | Nada en el camino para salir de la pobreza le cuesta a este hogar {floor} de un solo paso, en ninguno de {places}. |  |
| `places.answer.roadWorst.some` | The road out of poverty collapses hardest in {state}: {drop} of income gone between {at} and {to} of pay. | El camino para salir de la pobreza se derrumba con más fuerza en {state}: {drop} de ingreso que desaparecen entre {at} y {to} de pago. |  |
| `places.answer.roadWorst.none` | The road out of poverty holds across {places}: nothing on it costs this household {floor} in a single step. | El camino para salir de la pobreza aguanta en {places}: nada en él le cuesta a este hogar {floor} de un solo paso. |  |
| `places.answer.biggestLoss.some` | The largest one-step loss on the map is {state}'s {drop}, between {at} and {to} of pay; of {places}, {miss, plural, =0 {every one has a cliff somewhere on this household's curve} one {just one has no cliff at all} other {{miss} have no cliff at all}}. | La mayor pérdida en un escalón del mapa es la de {state}, {drop}, entre {at} y {to} de pago; de {places}, {miss, plural, =0 {todos tienen algún precipicio en la curva de este hogar} one {solo uno no tiene ningún precipicio} other {{miss} no tienen ningún precipicio}}. |  |
| `places.answer.biggestLoss.none` | No curve in {places} has a single step down of {floor} or more for this household. | Ninguna curva de {places} tiene un escalón hacia abajo de {floor} o más para este hogar. |  |
| `places.answer.dangerWidth.some` | {state} has the widest danger zones: {width} of earnings across which more pay leaves this household no better off. | {state} tiene las zonas de peligro más anchas: {width} de ingresos a lo largo de los cuales más pago no deja mejor a este hogar. |  |
| `places.answer.dangerWidth.none` | Nowhere in {places} does more pay leave this household no better off. | En ninguno de {places} hay un tramo en el que más pago no deje mejor a este hogar. |  |
| `places.answer.leap.some` | It takes a raise of {leap} in one move to clear the worst danger zone in {state} — the largest leap on the map. | Hace falta un aumento de {leap} de una sola vez para salir de la peor zona de peligro en {state}: el mayor salto del mapa. |  |
| `places.answer.leap.none` | No household in {places} has a danger zone to clear. | Ningún hogar de {places} tiene una zona de peligro que salvar. |  |
| `places.answer.safeExit.some` | This household is clear of every danger zone only above {exit} in {state}, the highest safe exit on the map. | Este hogar solo queda libre de toda zona de peligro por encima de {exit} en {state}, la salida segura más alta del mapa. |  |
| `places.answer.safeExit.open` | {n, plural, one {In one state the last danger zone had not closed by the top of the axis; the highest exit measured elsewhere is {state}'s {exit}.} other {In {n} states the last danger zone had not closed by the top of the axis; the highest exit measured elsewhere is {state}'s {exit}.}} | {n, plural, one {En un estado la última zona de peligro no se había cerrado al final del eje; la salida más alta medida en los demás es la de {state}, {exit}.} other {En {n} estados la última zona de peligro no se había cerrado al final del eje; la salida más alta medida en los demás es la de {state}, {exit}.}} |  |
| `places.answer.safeExit.none` | No danger zone is left anywhere in {places} for this household. | No queda ninguna zona de peligro en {places} para este hogar. |  |
| `places.answer.cliffCount.some` | {state}'s curve carries {n, plural, one {{count} cliff} other {{count} cliffs}} for this household, more than any other state. | La curva de {state} lleva {n, plural, one {{count} precipicio} other {{count} precipicios}} para este hogar, más que la de ningún otro estado. |  |
| `places.answer.cliffCount.none` | No curve in {places} has a step down of {floor} or more for this household. | Ninguna curva de {places} tiene un escalón hacia abajo de {floor} o más para este hogar. |  |
| `places.answer.deferredCliffCount.some` | {state} has the most cliffs that wait: {n, plural, one {{count} lands} other {{count} land}} at a later renewal rather than with the raise. | {state} es donde más precipicios esperan: {n, plural, one {{count} cae} other {{count} caen}} en una renovación posterior y no con el aumento. |  |
| `places.answer.deferredCliffCount.none` | No cliff in {places} waits for a later renewal; every one lands with the raise. | Ningún precipicio de {places} espera a una renovación posterior; todos caen con el aumento. |  |
| `places.howTo.heading` | How to read this map | Cómo leer este mapa |  |
| `places.howTo.measure` | The map shades {measure}: {describe} | El mapa sombrea {measure}: {describe} |  |
| `places.howTo.keyboard` | Each square is a button: the arrow keys move between them and Enter opens one. Its full-size twin is the row for the same state under “Every state, every measure”, which is also where every figure is written out. | Cada cuadro es un botón: las flechas se mueven entre ellos y Enter abre uno. Su equivalente de tamaño completo es la fila del mismo estado en «Cada estado, cada medida», que es también donde está escrita cada cifra. |  |
| `places.howTo.key.shaded` | a comparable figure, shaded by the scale above | una cifra comparable, sombreada según la escala de arriba |  |
| `places.howTo.key.none` | no cliff found — a measurement of zero, not a small loss | no se encontró precipicio — una medición de cero, no una pérdida pequeña |  |
| `places.howTo.key.roadNone` | no cliff between the poverty line and twice it | sin precipicio entre la línea de pobreza y el doble de esa línea |  |
| `places.howTo.key.past` | past the axis — a bound, not a value | más allá del eje — un límite, no un valor |  |
| `places.howTo.key.roadPast` | the road runs off this state's axis — no rate to compare | el camino queda fuera del eje de este estado — no hay cifra que comparar |  |
| `places.howTo.key.incomplete` | figures incomplete — a program the model cannot compute here is missing from them | cifras incompletas — falta un programa que el modelo no puede calcular aquí |  |
| `places.caution.hatched` | {n, plural, one {**Hatched is not low.** One state is hatched: {programs} is not modelled there, so its figures are floors and it is neither shaded nor ranked.} other {**Hatched is not low.** {n} states are hatched: {programs} is not modelled there, so their figures are floors and they are neither shaded nor ranked.}} | {n, plural, one {**Rayado no es bajo.** Un estado está rayado: {programs} no está modelado allí, así que sus cifras son pisos y no se sombrea ni se clasifica.} other {**Rayado no es bajo.** {n} estados están rayados: {programs} no está modelado allí, así que sus cifras son pisos y no se sombrean ni se clasifican.}} |  |
| `places.caution.past` | {n, plural, one {**Past the axis is not a number.** One state's figure runs off the top of the earnings scale, so it is a bound and must not be charted as a value.} other {**Past the axis is not a number.** {n} states' figures run off the top of the earnings scale, so they are bounds and must not be charted as values.}} | {n, plural, one {**Más allá del eje no es un número.** La cifra de un estado se sale del tope de la escala de ingresos, así que es un límite y no debe graficarse como un valor.} other {**Más allá del eje no es un número.** Las cifras de {n} estados se salen del tope de la escala de ingresos, así que son límites y no deben graficarse como valores.}} |  |
| `places.caution.roadPast` | {n, plural, one {**No rate to compare.** In one state this household's road out of poverty falls outside the earnings that state was swept over.} other {**No rate to compare.** In {n} states this household's road out of poverty falls outside the earnings those states were swept over.}} | {n, plural, one {**No hay cifra que comparar.** En un estado el camino de este hogar para salir de la pobreza queda fuera de los ingresos que se recorrieron allí.} other {**No hay cifra que comparar.** En {n} estados el camino de este hogar para salir de la pobreza queda fuera de los ingresos que se recorrieron allí.}} |  |
| `places.panels.everything` | Every state, every measure | Cada estado, cada medida |  |
| `places.panels.sources` | Where these numbers come from | De dónde vienen estas cifras |  |

## Shared phrases (program names, counties, verdict catalog) — 97 strings

| key | English | Spanish (draft) | Notes |
|---|---|---|---|
| `shared.program.snap` | SNAP | SNAP |  |
| `shared.program.medicaid` | Medicaid | Medicaid |  |
| `shared.program.chip` | CHIP | CHIP |  |
| `shared.program.eitc` | Earned Income Tax Credit (EITC) | Crédito Tributario por Ingreso del Trabajo (EITC) |  |
| `shared.program.ctc` | Child Tax Credit | Crédito Tributario por Hijos |  |
| `shared.program.aca` | Premium tax credit | Crédito fiscal para las primas |  |
| `shared.program.tanf` | TANF cash assistance | Asistencia en efectivo TANF |  |
| `shared.program.housing` | Housing voucher | Vale de vivienda |  |
| `shared.program.wic` | WIC | WIC |  |
| `shared.program.ssi` | SSI | SSI |  |
| `shared.program.headstart` | Head Start | Head Start |  |
| `shared.program.schoolmeals` | School meals | Comidas escolares |  |
| `shared.program.childcare` | CCDF child care subsidy | Subsidio de cuidado infantil CCDF |  |
| `shared.program.liheap` | LIHEAP energy assistance | Asistencia energética LIHEAP |  |
| `shared.pay.hour` | {figure} an hour | {figure} por hora |  |
| `shared.pay.week` | {figure} a week | {figure} a la semana |  |
| `shared.pay.month` | {figure} a month | {figure} al mes |  |
| `shared.pay.year` | {figure} a year | {figure} al año |  |
| `shared.ordinal` | {n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} | {n, selectordinal, other {#.º}} |  |
| `shared.numbers.ones` | ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'] | ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'] |  |
| `shared.numbers.tens` | ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'] | ['veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'] |  |
| `shared.numbers.compound` | {tens}-{ones} | {tens} y {ones} |  |
| `shared.reachVintage.one` | ACS {year} {n}-year PUMS | PUMS de {n} año de la ACS {year} |  |
| `shared.reachVintage.range` | ACS {from}–{to} {n}-year PUMS | PUMS de {n} años de la ACS {from}–{to} |  |
| `shared.model.versioned` | policyengine-us {version} | policyengine-us {version} |  |
| `shared.model.endpoint` | the PolicyEngine API at {endpoint} | la API de PolicyEngine en {endpoint} |  |
| `shared.model.unrecorded` | PolicyEngine (version not recorded) | PolicyEngine (versión no registrada) |  |
| `shared.tickThousands` | {amount}k | {amount}k |  |
| `shared.language.label` | Language | Idioma |  |
| `shared.state.AL` | Alabama | Alabama |  |
| `shared.state.AK` | Alaska | Alaska |  |
| `shared.state.AZ` | Arizona | Arizona |  |
| `shared.state.AR` | Arkansas | Arkansas |  |
| `shared.state.CA` | California | California |  |
| `shared.state.CO` | Colorado | Colorado |  |
| `shared.state.CT` | Connecticut | Connecticut |  |
| `shared.state.DE` | Delaware | Delaware |  |
| `shared.state.DC` | Washington, DC | Distrito de Columbia |  |
| `shared.state.FL` | Florida | Florida |  |
| `shared.state.GA` | Georgia | Georgia |  |
| `shared.state.HI` | Hawaii | Hawái |  |
| `shared.state.ID` | Idaho | Idaho |  |
| `shared.state.IL` | Illinois | Illinois |  |
| `shared.state.IN` | Indiana | Indiana |  |
| `shared.state.IA` | Iowa | Iowa |  |
| `shared.state.KS` | Kansas | Kansas |  |
| `shared.state.KY` | Kentucky | Kentucky |  |
| `shared.state.LA` | Louisiana | Luisiana |  |
| `shared.state.ME` | Maine | Maine |  |
| `shared.state.MD` | Maryland | Maryland |  |
| `shared.state.MA` | Massachusetts | Massachusetts |  |
| `shared.state.MI` | Michigan | Míchigan |  |
| `shared.state.MN` | Minnesota | Minnesota |  |
| `shared.state.MS` | Mississippi | Misisipi |  |
| `shared.state.MO` | Missouri | Misuri |  |
| `shared.state.MT` | Montana | Montana |  |
| `shared.state.NE` | Nebraska | Nebraska |  |
| `shared.state.NV` | Nevada | Nevada |  |
| `shared.state.NH` | New Hampshire | Nuevo Hampshire |  |
| `shared.state.NJ` | New Jersey | Nueva Jersey |  |
| `shared.state.NM` | New Mexico | Nuevo México |  |
| `shared.state.NY` | New York | Nueva York |  |
| `shared.state.NC` | North Carolina | Carolina del Norte |  |
| `shared.state.ND` | North Dakota | Dakota del Norte |  |
| `shared.state.OH` | Ohio | Ohio |  |
| `shared.state.OK` | Oklahoma | Oklahoma |  |
| `shared.state.OR` | Oregon | Oregón |  |
| `shared.state.PA` | Pennsylvania | Pensilvania |  |
| `shared.state.RI` | Rhode Island | Rhode Island |  |
| `shared.state.SC` | South Carolina | Carolina del Sur |  |
| `shared.state.SD` | South Dakota | Dakota del Sur |  |
| `shared.state.TN` | Tennessee | Tennessee |  |
| `shared.state.TX` | Texas | Texas |  |
| `shared.state.UT` | Utah | Utah |  |
| `shared.state.VT` | Vermont | Vermont |  |
| `shared.state.VA` | Virginia | Virginia |  |
| `shared.state.WA` | Washington | Washington |  |
| `shared.state.WV` | West Virginia | Virginia Occidental |  |
| `shared.state.WI` | Wisconsin | Wisconsin |  |
| `shared.state.WY` | Wyoming | Wyoming |  |
| `shared.correctionSource.modeled` | modeled | modelado |  |
| `shared.correctionSource.ladder` | ladder | escala |  |
| `shared.correctionSource.overridden` | overridden | reemplazado |  |
| `shared.correctionSource.added by HotGap` | added by HotGap | agregado por HotGap |  |
| `shared.correctionSource.in net income` | in net income | en el ingreso neto |  |
| `shared.county.county` | {name} County | Condado de {name} |  |
| `shared.county.parish` | {name} Parish | Parroquia de {name} |  |
| `shared.county.municipio` | {name} Municipio | Municipio de {name} |  |
| `shared.county.municipality` | {name} Municipality | Municipio de {name} |  |
| `shared.county.cityAndBorough` | {name} City and Borough | Ciudad y Distrito de {name} |  |
| `shared.county.borough` | {name} Borough | Distrito de {name} |  |
| `shared.county.censusArea` | {name} Census Area | Área Censal de {name} |  |
| `shared.county.city` | {name} city | Ciudad de {name} |  |
| `shared.correctionProgram.parentIncomeLimit` | {program} — parent income limit | {program} — límite de ingresos para el padre o la madre |  |
| `shared.correctionProgram.basicHealthProgram` | Basic Health Program — expanded-limit states | Basic Health Program — estados con límite ampliado |  |
| `shared.correctionProgram.premiumHelp` | State premium help | Ayuda estatal con la prima |  |
| `shared.correctionProgram.coverageGap` | {program} — coverage gap | {program} — brecha de cobertura |  |

## Sentences the calculation writes (core) — 46 strings

| code | English | Spanish (draft) | Notes |
|---|---|---|---|
| `_.language` | en | es-US |  |
| `_.status` | source | draft |  |
| `_.note` | The English behind every sentence core writes for a person to read: coverage notes, unmodeled programs, the other-benefits labels, validateAnswers details, /api error details. core/src/messages.ts renders them; a surface renders the same code in its own language (app/README.md § Languages). | Borrador redactado por el modelo el 2026-09-17, con las frases del camino de salida de la pobreza (road.*) agregadas el 2026-09-18; pendiente de revisión por un hablante nativo. / A draft, machine-written 2026-09-17, with the road-out-of-poverty sentences (road.*) added 2026-09-18, awaiting a native speaker's review (app/README.md § Languages). |  |
| `coverage.override.parentLimit` | HotGap sends the state's own published parent Medicaid income limit for this household's size, as a share of the 2026 poverty line including the MAGI disregard, because PolicyEngine's figure is five years out of date (policyengine-us #9474; fixed upstream in PR #9475). | HotGap envía el límite de ingresos de Medicaid para padres que el propio estado publica para el tamaño de este hogar, como proporción de la línea de pobreza de 2026 incluido el descuento MAGI, porque la cifra de PolicyEngine tiene cinco años de atraso (policyengine-us #9474; corregido río arriba en el PR #9475). |  |
| `coverage.override.nyBhp` | HotGap takes New York off PolicyEngine's expanded Basic Health Program list, so the Essential Plan ceiling is the 200% of poverty rule in force from 2026-07-01 for the whole year rather than the 250% upstream keeps (policyengine-us #9471; CMS approved the termination on 2026-03-20). | HotGap saca a Nueva York de la lista de Programas Básicos de Salud ampliados de PolicyEngine, de modo que el techo del Essential Plan es la regla del 200% de la pobreza vigente desde el 2026-07-01 para todo el año, y no el 250% que río arriba se conserva (policyengine-us #9471; CMS aprobó la terminación el 2026-03-20). |  |
| `coverage.maTafdc.elsewhere` | Massachusetts only; PolicyEngine's TANF stands as served. | Solo Massachusetts; el TANF de PolicyEngine se mantiene tal como se sirvió. |  |
| `coverage.maTafdc.applied` | HotGap recomputes the TAFDC grant under the state's ongoing-recipient rules ($200 a month per earner, then a 50% disregard; 106 CMR 704.281) and feeds it back to the engine so SNAP follows it, because PolicyEngine ends the grant abruptly (policyengine-us #9469; fix in PR #9477); the September clothing allowance is counted under other benefits, and the six-month full disregard is not modelled. | HotGap recalcula la ayuda TAFDC con las reglas del estado para beneficiarios en curso ($200 al mes por trabajador y luego un descuento del 50%; 106 CMR 704.281) y la devuelve al motor para que SNAP la siga, porque PolicyEngine termina la ayuda de golpe (policyengine-us #9469; corrección en el PR #9477); la asignación de ropa de septiembre se cuenta en otros beneficios, y el descuento total de seis meses no está modelado. |  |
| `coverage.premium.modeled` | PolicyEngine computes {program} itself, and HotGap subtracts it from the premium the household pays, because the engine reports it as a health benefit rather than in the out-of-pocket premium HotGap reads; no local schedule is applied. | PolicyEngine calcula {program} por sí mismo, y HotGap lo resta de la prima que paga el hogar, porque el motor lo informa como un beneficio de salud y no en la prima de bolsillo que HotGap lee; no se aplica ningún calendario local. |  |
| `coverage.premium.ladder` | {tiers, select, yes {HotGap applies {program}'s published premium schedule itself — a $0 premium up to {pct}% of the poverty line and the reduced premiums above it, as read on {readOn} — because PolicyEngine does not model the program (policyengine-us #9481).} other {HotGap applies {program}'s published premium schedule itself — a $0 premium up to {pct}% of the poverty line, as read on {readOn} — because PolicyEngine does not model the program (policyengine-us #9481).}} | {tiers, select, yes {HotGap aplica por sí mismo el calendario de primas publicado de {program} (una prima de $0 hasta el {pct}% de la línea de pobreza y las primas reducidas por encima, leído el {readOn}) porque PolicyEngine no modela el programa (policyengine-us #9481).} other {HotGap aplica por sí mismo el calendario de primas publicado de {program} (una prima de $0 hasta el {pct}% de la línea de pobreza, leído el {readOn}) porque PolicyEngine no modela el programa (policyengine-us #9481).}} |  |
| `coverage.premium.perMember` | {range, select, flat {HotGap applies {program}'s published schedule itself — ${dearest} a month for each person on the plan, up to {pct}% of the poverty line, as read on {readOn} — because the version of PolicyEngine this sweep ran against does not carry the program (policyengine-us {issue}).} other {HotGap applies {program}'s published schedule itself — ${cheapest} to ${dearest} a month for each person on the plan, up to {pct}% of the poverty line, as read on {readOn} — because the version of PolicyEngine this sweep ran against does not carry the program (policyengine-us {issue}).}} | {range, select, flat {HotGap aplica por sí mismo el calendario publicado de {program} (${dearest} al mes por cada persona en el plan, hasta el {pct}% de la línea de pobreza, leído el {readOn}) porque la versión de PolicyEngine contra la que corrió este barrido no incluye el programa (policyengine-us {issue}).} other {HotGap aplica por sí mismo el calendario publicado de {program} (de ${cheapest} a ${dearest} al mes por cada persona en el plan, hasta el {pct}% de la línea de pobreza, leído el {readOn}) porque la versión de PolicyEngine contra la que corrió este barrido no incluye el programa (policyengine-us {issue}).}} |  |
| `coverage.premium.unserved` | {program} is not counted: PolicyEngine served no figure for it on this sweep, and HotGap's own schedules cover only $0-premium tiers, so the premiums here are overstated by it. | {program} no se cuenta: PolicyEngine no sirvió ninguna cifra para él en este barrido, y los calendarios propios de HotGap solo cubren los tramos de prima $0, así que las primas de aquí están sobreestimadas por ese monto. |  |
| `coverage.premium.none` | No state premium help applies: PolicyEngine serves none for this state, and HotGap knows of no program to add. | No aplica ninguna ayuda estatal con las primas: PolicyEngine no sirve ninguna para este estado, y HotGap no conoce ningún programa que agregar. |  |
| `coverage.childcare.countedEverywhere` | PolicyEngine counts the child-care subsidy inside net income in every state on this version (policyengine-us #9503), so HotGap only names it. | PolicyEngine cuenta el subsidio de cuidado infantil dentro del ingreso neto en todos los estados en esta versión (policyengine-us #9503), así que HotGap solo lo nombra. |  |
| `coverage.childcare.counted` | PolicyEngine already counts this state's child-care subsidy in net income, so HotGap only names it. | PolicyEngine ya cuenta el subsidio de cuidado infantil de este estado en el ingreso neto, así que HotGap solo lo nombra. |  |
| `coverage.childcare.added` | PolicyEngine computes the child-care subsidy but leaves it out of net income here, so HotGap adds it back, until the engine's own fix (policyengine-us #9405, PR #9503) reaches this endpoint. | PolicyEngine calcula el subsidio de cuidado infantil pero lo deja fuera del ingreso neto aquí, así que HotGap lo vuelve a sumar, hasta que la corrección propia del motor (policyengine-us #9405, PR #9503) llegue a este punto de acceso. |  |
| `coverage.coverageGap.applies` | In this non-expansion state an adult with no Medicaid and no premium credit below 100% of the poverty line is charged no marketplace premium, and the point is flagged, because PolicyEngine bills the full premium to someone the marketplace would not enrol (policyengine-us #9472). | En este estado sin expansión, a un adulto sin Medicaid y sin crédito para primas por debajo del 100% de la línea de pobreza no se le cobra ninguna prima del mercado, y el punto se marca, porque PolicyEngine le cobra la prima completa a alguien a quien el mercado no inscribiría (policyengine-us #9472). |  |
| `coverage.coverageGap.expansion` | Expansion state: adults to 138% of the poverty line are on Medicaid, so the coverage-gap correction never fires. | Estado con expansión: los adultos hasta el 138% de la línea de pobreza están en Medicaid, así que la corrección por brecha de cobertura nunca se activa. |  |
| `coverage.unmodeled.premiumKnown` | {program} ({detail}) is not computed by PolicyEngine, and HotGap's own schedules cover only $0-premium tiers, so the premiums here are overstated by it. | {program} ({detail}) no lo calcula PolicyEngine, y los calendarios propios de HotGap solo cubren los tramos de prima $0, así que las primas de aquí están sobreestimadas por ese monto. |  |
| `coverage.unmodeled.premiumUnserved` | PolicyEngine models {program}, but this sweep's endpoint did not serve it and HotGap has no schedule of its own for it, so the premiums here are overstated by it. | PolicyEngine modela {program}, pero el punto de acceso de este barrido no lo sirvió y HotGap no tiene un calendario propio para él, así que las primas de aquí están sobreestimadas por ese monto. |  |
| `coverage.unmodeled.childcare` | PolicyEngine paid $0 of child-care subsidy at every point to a household here that pays for care — a modelling gap, not a state rule — so a real cliff may be missing; footnote this state rather than read the gap as good news. | PolicyEngine pagó $0 de subsidio de cuidado infantil en cada punto a un hogar de aquí que paga por el cuidado (una brecha del modelo, no una regla del estado), así que podría faltar un precipicio real; ponga una nota a este estado en vez de leer la brecha como buena noticia. |  |
| `coverage.liheap.credit` | Michigan pays its heating assistance as the refundable Home Heating Credit; PolicyEngine models it and HotGap counts it in state credits, assuming heat is not included in rent — the credit halves when it is. | Míchigan paga su asistencia para calefacción como el Home Heating Credit, un crédito reembolsable; PolicyEngine lo modela y HotGap lo cuenta en los créditos estatales, suponiendo que la calefacción no está incluida en la renta: el crédito se reduce a la mitad cuando lo está. |  |
| `coverage.liheap.boundary` | {served, select, known {HotGap shows where energy assistance (LIHEAP) stops in this state — {limit} — and what the state pays at that top band, but counts the money only for a household that says it gets it, because the program is a block grant that served about {pct}% of its income-eligible households in {vintage}, so a curve that assumed it would draw a benefit most eligible families never receive.} other {HotGap shows where energy assistance (LIHEAP) stops in this state — {limit} — and what the state pays at that top band, but counts the money only for a household that says it gets it, because the program is a block grant that served a share of eligible households the {vintage} profile does not give, so a curve that assumed it would draw a benefit most eligible families never receive.}} | {served, select, known {HotGap muestra dónde se detiene la asistencia energética (LIHEAP) en este estado ({limit}) y cuánto paga el estado en esa banda superior, pero cuenta el dinero solo para un hogar que dice recibirlo, porque el programa es una subvención en bloque que atendió a cerca del {pct}% de sus hogares elegibles por ingreso en {vintage}, así que una curva que lo supusiera dibujaría un beneficio que la mayoría de las familias elegibles nunca recibe.} other {HotGap muestra dónde se detiene la asistencia energética (LIHEAP) en este estado ({limit}) y cuánto paga el estado en esa banda superior, pero cuenta el dinero solo para un hogar que dice recibirlo, porque el programa es una subvención en bloque que atendió a una proporción de hogares elegibles que el perfil de {vintage} no indica, así que una curva que lo supusiera dibujaría un beneficio que la mayoría de las familias elegibles nunca recibe.}} |  |
| `coverage.otherBenefits.unidentified` | not yet identified — probe the engine with the household-benefit lists (stateOtherBenefits.ts) | todavía sin identificar — sondee el motor con las listas de beneficios del hogar (stateOtherBenefits.ts) |  |
| `coverage.otherBenefits.nj_property_tax_relief` | New Jersey ANCHOR property-tax relief, renter benefit ($450 a year under $150,000 of income) | Alivio del impuesto predial ANCHOR de Nueva Jersey, beneficio para inquilinos ($450 al año por debajo de $150,000 de ingresos) |  |
| `program.liheap` | LIHEAP | LIHEAP |  |
| `program.childcareCcdf` | Child-care subsidy (CCDF) | Subsidio de cuidado infantil (CCDF) |  |
| `program.homeHeatingCredit` | Home Heating Credit | Home Heating Credit |  |
| `liheap.limit.fpg` | {pct}% of the poverty guideline | {pct}% de la guía de pobreza |  |
| `liheap.limit.smi` | {pct}% of state median income | {pct}% del ingreso mediano del estado |  |
| `liheap.limit.smiVintage` | {pct}% of state median income (the state still applies the {vintage} table) | {pct}% del ingreso mediano del estado (el estado todavía aplica la tabla de {vintage}) |  |
| `liheap.limit.smiBySize` | {from}% to {to}% of state median income, rising with household size | {from}% a {to}% del ingreso mediano del estado, subiendo con el tamaño del hogar |  |
| `road.sentence` | {state} — {household} who earns their way from poverty to twice poverty {sign, select, keeps {keeps {cents}¢ of every extra dollar} other {ends up {cents}¢ poorer for every extra dollar}}. | {state} — {household} que se abre camino de la pobreza al doble de la pobreza {sign, select, keeps {se queda con {cents}¢ de cada dólar extra} other {termina {cents}¢ más pobre por cada dólar extra}}. |  |
| `road.rate` | {sign, select, keeps {keeps {cents}¢ of each extra dollar} other {loses {cents}¢ of each extra dollar}} | {sign, select, keeps {se queda con {cents}¢ de cada dólar extra} other {pierde {cents}¢ de cada dólar extra}} |  |
| `road.collapse` | The road collapses at {at}, where {program} ends and the family loses {drop} in one step. | El camino se derrumba en {at}, donde termina {program} y la familia pierde {drop} de un solo paso. |  |
| `road.position` | {n} in 100 families like this earn less | {n} de cada 100 familias como esta ganan menos |  |
| `road.keepNext` | Of the next {over} you earn, you keep about {kept}. | De los próximos {over} que gane, se queda con unos {kept}. |  |
| `road.plateau` | Of the next {over} you earn, you keep about {kept} — a plateau: more work, almost the same money. | De los próximos {over} que gane, se queda con unos {kept}: una meseta, más trabajo y casi el mismo dinero. |  |
| `validate.notObject` | body must be an object | el cuerpo debe ser un objeto |  |
| `validate.field` | {field} | {field} |  |
| `place.territory` | HotGap does not model US territories yet | HotGap todavía no modela los territorios de EE. UU. |  |
| `place.noState` | no state for ZIP {zip} | no hay estado para el código postal {zip} |  |
| `place.stateMismatch` | ZIP {zip} is in {zipState}, not {state} | El código postal {zip} está en {zipState}, no en {state} |  |
| `api.invalidJson` | invalid JSON | JSON no válido |  |
| `deferral.head_start_program_year` | the end of the next Head Start program year (45 CFR 1302.12(j)(1)) | el final del próximo año del programa Head Start (45 CFR 1302.12(j)(1)) |  |
| `deferral.child_continuous_eligibility` | the child's next yearly renewal, up to 12 months away (42 CFR 435.926, 457.342) | la próxima renovación anual del niño, hasta 12 meses después (42 CFR 435.926, 457.342) |  |
| `deferral.transitional_medical_assistance` | 6 to 12 months of Transitional Medical Assistance run out (§1925 of the Social Security Act, 42 U.S.C. 1396r-6) | que se agoten los 6 a 12 meses de Asistencia Médica de Transición (§1925 de la Ley del Seguro Social, 42 U.S.C. 1396r-6) |  |

## Other — 3 strings

| key | English | Spanish (draft) | Notes |
|---|---|---|---|
| `_.language` | en | es-US |  |
| `_.status` | source | draft |  |
| `_.note` | The English every other locale is a translation of; app/src/lib/copy.ts says the shape and app/README.md § Languages the rules. | Borrador. Redactado por el modelo el 2026-09-17 a partir de en.json; pendiente de revisión por un hablante nativo antes de considerarse definitivo (app/README.md § Languages). Registro: el ciudadano y la hoja del cliente en usted, sencillo; el trabajador social, profesional; el periodista, citable. Los acrónimos de los programas se conservan; la frase sencilla se traduce. / A draft: machine-written 2026-09-17 from en.json, awaiting a native speaker's review. Redactado de nuevo el 2026-09-18 para el registro nuevo del ciudadano: como se lo diría una trabajadora social al otro lado del escritorio. Sigue sin revisar. / Redrafted 2026-09-18 to the new citizen register; still unreviewed. Tres lectores nativos leyeron la página el 2026-09-18 y señalaron tres frases que sonaban a máquina; están corregidas. / Three native readers flagged three machine-sounding phrases on 2026-09-18; fixed. |  |
