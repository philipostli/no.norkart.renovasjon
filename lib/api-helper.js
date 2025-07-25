'use strict';

const Homey = require('homey');

class ApiHelper {
  
  static async getCalendar(data, homey) {
    // Create query parameters
    const params = new URLSearchParams({
        kommunenr: data.countyId,
        gatenavn: data.streetName,
        gatekode: data.addressCode,
        husnr: data.houseNumber
    });

    const url = `${Homey.env.API_BASE_URL}/tommekalender?${params.toString()}`;

    try {
        // homey.log(url);
        // homey.log(data);
        // homey.log(params.toString());

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Kommunenr': data.countyId,
                'RenovasjonAppKey': Homey.env.RENOVASJON_APP_KEY
            }
        });
        
        if (response.status == 200) {
            const responseData = await response.json();
            // homey.log(responseData);
            return responseData;
        } else {
            // homey.log(response.status);  
            return false;
        }
    }
    catch (error) {
        homey.error(error);
        return false;
    }
  }

  static async getFractions(data, homey) {
    const url = `${Homey.env.API_BASE_URL}/fraksjoner`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Kommunenr': data.countyId,
          'RenovasjonAppKey': Homey.env.RENOVASJON_APP_KEY
        }
      });
      
      if (response.status == 200) {
        const responseData = await response.json();
        return responseData;
      } else {
        return false;
      }
    }
    catch (error) {
      homey.error(error);
      return false;
    }
  }
}

module.exports = ApiHelper; 