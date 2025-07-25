'use strict';

const Homey = require('homey');
const ApiHelper = require('../../lib/api-helper');

module.exports = class RenovationDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('RenovationDriver has been initialized');
  }

  async onPair(session) {
    await session.showView('search_address');

    session.setHandler("settingsChanged", async (data) => {
      // this.homey.log("settingsChanged");
      // this.homey.log(data);
      this.addressData = data;
      return true;
    });

    session.setHandler("checkAddress", async (data) => {
      // this.homey.log(data);
      return await this.getApiResult(data);
    });

    session.setHandler("getCalendar", async (data) => {
      //this.homey.app.dDebug(data);
      return await ApiHelper.getCalendar(data, this.homey);
    });

    session.setHandler("onPairListDevices", async () => {
      return await this.onPairListDevices();
    });

    session.setHandler("list_devices", async () => {
      return await this.onPairListDevices(session);
    });

  }

  
  async onPairListDevices(session) {
    let devices = [];

    let deviceName = `Renovasjon ${this.addressData["streetName"]} ${this.addressData["houseNumber"]}${this.addressData["houseLetter"]}`;
    let deviceId = this.addressData["streetName"] + this.addressData["houseNumber"] + this.addressData["houseLetter"];
    let device = {
      name: deviceName,
      data: {
        id: deviceId
      },
      settings: {
        streetName: this.addressData["streetName"],
        houseNumber: this.addressData["houseNumber"].toString() + this.addressData["houseLetter"],
        countyId: this.addressData["countyId"],
        addressCode: this.addressData["addressCode"].toString(),
      }
    };
    devices.push(device);
    // this.log(device);
    return devices;
  }

  async getApiResult(data) {

    const url = `${Homey.env.GEONORGE_URL}?sok=${data.streetName} ${data.houseNumber} ${data.postCode} ${data.postCity}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        const responseData = await response.json();
        // this.homey.log(responseData);
        // this.homey.log(response.status);

        if (response.status == 200 && responseData.adresser && responseData.adresser.length > 0) {
            const address = responseData.adresser[0];
            
            let addressData = {
                "addressID": "",
                "countyId": "",
                "addressCode": "",
                "kommune": "",
                "addressName": "",
                "streetName": "",
                "houseNumber": "",
                "houseLetter": "",
                "postCode": ""
            }

            addressData.countyId = address.kommunenummer;
            addressData.addressCode = address.adressekode;
            addressData.addressID = address.adressekode;
            addressData.kommune = address.kommunenavn;
            addressData.addressName = address.adressetekst;
            addressData.streetName = address.adressenavn;
            addressData.houseNumber = address.nummer;
            addressData.houseLetter = address.bokstav;
            addressData.postCode = address.postnummer;

            return addressData;
        } else {
            return false;
        }
    }
    catch (error) {
        this.homey.error(error);
        return false;
    }
  }




};
