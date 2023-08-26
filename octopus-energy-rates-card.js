class OctopusEnergyRatesCard extends HTMLElement {
    set hass(hass) {
        const config = this._config;
        var card = {}
        if (!this.content) {
            this.card = document.createElement('ha-card');
            this.content = document.createElement('div');
            this.content.style.padding = '0 16px 16px';

            const style = document.createElement('style');
            style.textContent = `
            table {
                width: 100%;
                padding: 0px;
                spacing: 0px;
            }
            table.sub_table {
                border-collapse: seperate;
                border-spacing: 0px 2px;
            }
            table.main {
                padding: 0px;
            }
            thead th {
                text-align: left;
                padding: 0px;
            }
            td {
                vertical-align: top;
                padding: 2px;
                spacing: 0px;
            }
            tr.rate_row{
                text-align:center;
                width:80px;
            }
            td.time {
                text-align:center;
                vertical-align: middle;
            }
            td.time_red{
                border: 1px solid #c93333;
            }
            td.time_orange{
                border: 1px solid #b06f00;
            }
            td.time_green{
                border: 1px solid #23ae34;
            }
            td.time_blue{
                border: 1px solid #391CD9;
            }
            td.time_cheapest{
                border-bottom: 1px solid LightGreen;
            }
            td.time_cheapestblue{
                border-bottom: 1px solid LightBlue;
            }
            td.rate {
                color:black;
                text-align:center;
                vertical-align: middle;
                width:80px;
            }
            td.red {
                background-color: #c93333;
            }
            td.orange {
                background-color: #b06f00;
            }
            td.green {
                background-color: #23ae34;
            }

            td.red_g {
                color:white
                border: 1px solid #c93333;
                background-color: #c93333;
            }
            td.orange_g {
                border: 1px solid #b06f00;
                background: repeating-linear-gradient(
                    -45deg,
                    #c93333,
                    #c93333 10px,
                    #948700 10px,
                    #948700 20px
                  );
            }
            td.green_g {
                border: 1px solid #23ae34;
                background:repeating-linear-gradient(
                    -45deg,
                    #c93333,
                    #c93333 10px,
                    #23ae34 10px,
                    #23ae34 20px
                  );
            }

            td.blue {
                border: 1px solid #391CD9;
                background-color: #391CD9;
            }
            td.cheapest {
                color: black;
                border: 2px solid LightGreen;
                background-color: LightGreen;
            }
            td.cheapestblue {
                color: black;
                border: 2px solid LightBlue;
                background-color: LightBlue;
            }
            `;
            this.card.appendChild(style);
            this.card.appendChild(this.content);
            this.appendChild(this.card);
        }

        const colours_import = ['green', 'red', 'orange', 'blue', 'cheapest', 'cheapestblue'];
        const colours_export = [ 'red', 'green', 'orange' ];

        const currentEntityId = config.currentEntity;
        const futureEntityId = config.futureEntity;
        const unitstr = config.unitstr;
        const roundUnits = config.roundUnits;
        const showpast = config.showpast;
        const showday = config.showday;
        const hour12 = config.hour12;
        var colours = (config.exportrates ? colours_export : colours_import);
        var combinedRates = [];
        
        // Grab the rates which are stored as an attribute of the sensor
        const currentstate = hass.states[currentEntityId];
        const futurestate = hass.states[futureEntityId];
        
        // Combine the data sources
        if (typeof(currentstate) != 'undefined' && currentstate != null)
        {
            const currentattributes = this.reverseObject(currentstate.attributes);
            var ratesCurrent = currentattributes.rates;
    
            ratesCurrent.forEach(function (key) {
                combinedRates.push(key);
            });
        }
        
        if (typeof(futurestate) != 'undefined' && futurestate != null)
        {
            const futureattributes = this.reverseObject(futurestate.attributes);
            var ratesFuture = futureattributes.rates;
        
            ratesFuture.forEach(function (key) {
                combinedRates.push(key);
            });
        }
        
        var rates_list_length = 0;
        var mean_rate = 0;
        var filteredRates = [];
        combinedRates.forEach(function (key) {
            const date_milli = Date.parse(key.start);
            var date = new Date(date_milli);
            if(showpast || (date - Date.parse(new Date())>-1800000)) {
                rates_list_length++;
                mean_rate += key.value_inc_vat * 100;
                filteredRates.push(key);
            }
        });
        mean_rate = mean_rate / rates_list_length;
        this.card.header = config.title + " (~" +  mean_rate.toFixed(roundUnits) + unitstr + ")";

        var tables = "";
        var current_index = 0;

        filteredRates.forEach(function (key) {
            const date_milli = Date.parse(key.start);
            var date = new Date(date_milli);
            const lang = navigator.language || navigator.languages[0];
            var options = {hourCycle: 'h23', hour12: hour12, hour: '2-digit', minute:'2-digit'};
            // The time formatted in the user's Locale
            var time_locale = date.toLocaleTimeString(lang, options);
            // If the showday config option is set, include the shortened weekday name in the user's Locale
            var date_locale = (showday ? date.toLocaleDateString(lang, { weekday: 'short' }) + ' ' : '');
            // Green
            var colour = colours[0];
            // orange
            if (key.value_inc_vat * 100 > mean_rate) 
                colour = colours[2];
            // blue
            else if (key.value_inc_vat * 100 <= 0 ) 
                colour = colours[3];

            var ext = "";
            if (key.value_inc_vat * 100 > config.mediumlimit) 
                ext = "_g";

            if(showpast || (date - Date.parse(new Date())>-1800000)) {
                if (current_index % config.cols == 0)
                    tables = tables.concat("<tr class='rate_row'>")

                tables = tables.concat("<td class='time time_"+colour+"'>" + date_locale + time_locale + 
                        "</td><td class='rate "+colour+ext+"'>" + (key.value_inc_vat * 100).toFixed(roundUnits) + unitstr + "</td>");

                if (current_index % config.cols == 1) {
                    tables = tables.concat("</tr>")
                };
                current_index++;
            }
        });

        this.content.innerHTML = `
        <table class="main">
            <tbody>
                ${tables}
            </tbody>
        </table>
        `;
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
