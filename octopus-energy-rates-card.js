class OctopusEnergyRatesCard extends HTMLElement {
    set hass(hass) {
        const config = this._config;
        if (!this.content) {
            this.card = document.createElement('ha-container');
            this.content = document.createElement('div');
            this.content.style.padding = '0 16px 16px';

            const style = document.createElement('style');
            style.textContent = `
table {
    width: 100%;
    padding: 8px 8px 8px 8px;
}

td {
    vertical-align: top;
    padding: 4px;
}

tr.rate_row {
    text-align: center;
    width: 90px;
}

td.time {
    text-align: center;
    vertical-align: middle;
    width: 90px;
}

td.time_orange {
    border: 1px solid var(--warning-color);
}

td.time_green {
    border: 1px solid var(--success-color);
}

td.time_blue {
    border: 1px solid var(--info-color);
}

td.rate {
    color: black;
    text-align: center;
    vertical-align: middle;
    width: 80px;
}

td.orange {
    border: 1px solid var(--warning-color);
    background-color: var(--warning-color);
}

td.green {
    border: 1px solid var(--success-color);
    background-color: var(--success-color);
}

td.blue {
    border: 1px solid var(--info-color);
    background-color: var(--info-color);
}

td.blue_over_median {
    border: 1px solid var(--warning-color);
    background: repeating-linear-gradient(-45deg,
            var(--error-color),
            var(--error-color) 10px,
            var(--warning-color) 10px,
            var(--warning-color) 20px);
}

td.orange_over_median {
    border: 1px solid var(--warning-color);
    background: repeating-linear-gradient(-45deg,
            var(--error-color),
            var(--error-color) 10px,
            var(--warning-color) 10px,
            var(--warning-color) 20px);
}

td.green_over_median {
    border: 1px solid var(--success-color);
    background-color: var(--success-color);
}
                `;
            this.card.appendChild(style);
            this.card.appendChild(this.content);
            this.appendChild(this.card);
        }
        var todayRates = [];
        var tomorrowRates = [];
        const lang = navigator.language || navigator.languages[0];

        // Grab the rates which are stored as an attribute of the sensor
        const currentEntity = hass.states[config.currentEntity];
        const futureEntity = hass.states[config.futureEntity];

        var allSlotsTargetTimes = [];
        const targetTimesEntities = config.targetTimesEntities && Object.keys(config.targetTimesEntities) || [];
        // Iterate through each entity in targetTimesEntities
        for (const entityId of targetTimesEntities) {
            const entityTimesState = hass.states[entityId];
            const entityExtraData = config.targetTimesEntities[entityId] || [];
            const backgroundColour = entityExtraData.backgroundColour || "Navy";
            const timePrefix = entityExtraData.prefix || "";
            // Access the attributes of the current entity
            const entityAttributes = entityTimesState ? this.reverseObject(entityTimesState.attributes) : {};
            // Get the target_times array, handling potential undefined cases
            const targetTimes = entityAttributes.target_times || [];
            // Iterate through each target time and push it individually
            for (const targetTime of targetTimes) {
                allSlotsTargetTimes.push({
                    start: targetTime.start,
                    end: targetTime.end,
                    color: backgroundColour,
                    timePrefix: timePrefix,
                });
            }
        }

        var rates_list_length = 0;
        var todayMeanRate = 0;
        var todaysDay;

        // Combine the data sources
        if (typeof (currentEntity) != 'undefined' && currentEntity != null) {
            const currentattributes = this.reverseObject(currentEntity.attributes);
            var ratesCurrent = currentattributes.rates;

            ratesCurrent.forEach(function (key) {
                const date_milli = Date.parse(key.start);
                var date = new Date(date_milli);
                todaysDay = date.toLocaleDateString(lang, { weekday: 'long' });

                rates_list_length++;
                todayMeanRate += key.value_inc_vat * 100;

                if (config.showpast || (date - Date.parse(new Date()) > -1800000)) {
                    todayRates.push(key);
                }
            });
        }

        todayMeanRate = todayMeanRate / rates_list_length;
        rates_list_length = 0
        var tomorrowMeanRate = 0;
        var tomorrowsDay;

        if (typeof (futureEntity) != 'undefined' && futureEntity != null) {
            const futureattributes = this.reverseObject(futureEntity.attributes);
            var ratesFuture = futureattributes.rates;

            ratesFuture.forEach(function (key) {
                const date_milli = Date.parse(key.start);
                var date = new Date(date_milli);
                tomorrowsDay = date.toLocaleDateString(lang, { weekday: 'long' });

                rates_list_length++;
                tomorrowMeanRate += key.value_inc_vat * 100;
                tomorrowRates.push(key);
            });
        }


        tomorrowMeanRate = tomorrowMeanRate / rates_list_length;
        const title = config.title;

        const todayTitle = todaysDay + " (~" + todayMeanRate.toFixed(config.roundUnits) + config.unitstr + ")";
        const tomorrowTitle = tomorrowsDay + " (~" + tomorrowMeanRate.toFixed(config.roundUnits) + config.unitstr + ")";

        this.content.innerHTML = `
        <h1 class="card-header">${title}</h1>
        <h2 class="card-header">${todayTitle} </h2>
        <ha-card class="card">
            ${this.name(todayRates, todayMeanRate, allSlotsTargetTimes)}
        </ha-card>

        `;
        if (typeof (futureEntity) != 'undefined' && futureEntity != null) {
            this.content.innerHTML += `
                <h2 class="card-header">${tomorrowTitle}</h2>
                <ha-card class="card">
                    ${this.name(tomorrowRates, tomorrowMeanRate, allSlotsTargetTimes)}
                </ha-card>
        `
        }
    }

    name(rates, mean_rate, allSlotsTargetTimes) {
        const config = this._config;

        var colours = ['green', 'blue', 'orange'];

        var tables = `
        <table class="main">
        <tbody>
        `;
        var current_index = 0;

        rates.forEach(function (key) {
            const date_milli = Date.parse(key.start);
            var date = new Date(date_milli);
            const lang = navigator.language || navigator.languages[0];
            var options = { hourCycle: 'h23', hour12: config.hour12, hour: '2-digit', minute: '2-digit' };
            // The time formatted in the user's Locale
            var time_locale = date.toLocaleTimeString(lang, options);
            // Blue
            var colour = colours[1];
            // Orange
            if (key.value_inc_vat * 100 > mean_rate)
                colour = colours[2];
            // Green
            else if (key.value_inc_vat * 100 <= 0)
                colour = colours[0];

            var targetTimePrefix = "";
            // Check if the current time row corresponds to a target time
            allSlotsTargetTimes.forEach(function (targetTime) {
                const startTime = new Date(targetTime.start);
                const endTime = new Date(targetTime.end);
                if (date >= startTime && date < endTime) {
                    targetTimePrefix = targetTime.timePrefix ? targetTimePrefix + targetTime.timePrefix + " " : targetTimePrefix;
                }
            });

            var ext = "";
            if (key.value_inc_vat * 100 > config.mediumlimit)
                ext = "_over_median";

            if (config.showpast || (date - Date.parse(new Date()) > -1800000)) {
                if (current_index % config.cols == 0)
                    tables = tables.concat("<tr class='rate_row'>")

                tables = tables.concat("<td class='time time_" + colour + "'>" + targetTimePrefix + time_locale +
                    "</td><td class='rate " + colour + ext + "'>" + (key.value_inc_vat * 100).toFixed(config.roundUnits) + config.unitstr + "</td>");

                if (current_index % config.cols == 1) {
                    tables = tables.concat("</tr>")
                };
                current_index++;
            }
        });

        tables += `</tbody></table>`
        return tables;
    }

    reverseObject(object) {
        var newObject = {};
        var keys = [];

        for (var key in object) {
            keys.push(key);
        }

        for (var i = keys.length - 1; i >= 0; i--) {
            var value = object[keys[i]];
            newObject[keys[i]] = value;
        }

        return newObject;
    }

    setConfig(config) {
        if (!config.currentEntity) {
            throw new Error('You need to define an entity');
        }

        const defaultConfig = {
            // Controls how many columns the rates split in to
            cols: 1,
            // Show rates that already happened in the card
            showpast: false,
            // Show the day of the week with the time
            showday: false,
            // Use 12 or 24 hour time
            hour12: true,
            // Controls the title of the card
            title: 'Agile Rates',
            // Colour controls:
            // If the price is above highlimit, the row is marked red.
            // If the price is above mediumlimit, the row is marked yellow.
            // If the price is below mediumlimit, the row is marked green.
            // If the price is below 0, the row is marked blue.
            mediumlimit: 20,
            highlimit: 30,
            // Controls the rounding of the units of the rate
            roundUnits: 2,
            // The unit string to show if units are shown after each rate
            unitstr: 'p/kWh',
            // Make the colouring happen in reverse, for export rates
            exportrates: false,
            // Higlight the cheapest rate
            cheapest: false,
            // Combine equal rates
            combinerate: false,
            // multiple rate values for pence (100) or pounds (1)
            multiplier: 100
        };

        const cardConfig = {
            ...defaultConfig,
            ...config,
        };

        this._config = cardConfig;
    }

    // The height of your card. Home Assistant uses this to automatically
    // distribute all cards over the available columns.
    getCardSize() {
        return 3;
    }
}

customElements.define('octopus-energy-rates-card', OctopusEnergyRatesCard);
// Configure the preview in the Lovelace card picker
window.customCards = window.customCards || [];
window.customCards.push({
    type: 'octopus-energy-rates-card',
    name: 'Octopus Energy Rates Card',
    preview: false,
    description: 'This card displays the energy rates for Octopus Energy',
});
