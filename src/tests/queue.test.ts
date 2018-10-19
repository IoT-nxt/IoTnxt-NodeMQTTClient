import { IotnxtQueue } from '../iotnxt/iotnxt'
import { expect } from 'chai';
import 'mocha';

var deviceTree = {};
deviceTree["House|1:Appliances|1"] = {
    Make: "Pi Gateway",
    Model: "Pi 3 B",
    DeviceName: "Kichen|1:Stove|1",
    DeviceType: "Stove",
    Properties: {
        StoveLight: {
            PropertyName: "StoveLight",
            DataType: null
        }
    }
};

let mockConfig: any = {
    //Gateway Id , this MUST be unique for every pi/gateway unit
    GatewayId: "TutorialGateway01",
    //secret is your password to connect the Gateway, this cannot be changed , dont share with anyone!
    secretkey: "166123181241239",
    FirmwareVersion: "5.0.26",
    Make: "Pi Gateway",
    Model: "nodejs client",
    id: "Pi 3 B",
    publickey: "<RSAKeyValue><Exponent>AQAB</Exponent><Modulus>rbltknM3wO5/TAEigft0RDlI6R9yPttweDXtmXjmpxwcuVtqJgNbIQ3VduGVlG6sOg20iEbBWMCdwJ3HZTrtn7qpXRdJBqDUNye4Xbwp1Dp+zMFpgEsCklM7c6/iIq14nymhNo9Cn3eBBM3yZzUKJuPn9CTZSOtCenSbae9X9bnHSW2qB1qRSQ2M03VppBYAyMjZvP1wSDVNuvCtjU2Lg/8o/t231E/U+s1Jk0IvdD6rLdoi91c3Bmp00rVMPxOjvKmOjgPfE5LESRPMlUli4kJFWxBwbXuhFY+TK2I+BUpiYYKX+4YL3OFrn/EpO4bNcI0NHelbWGqZg57x7rNe9Q==</Modulus></RSAKeyValue>",
    hostaddress: "greenqueue.prod.iotnxt.io"
}

let queueClient = new IotnxtQueue(mockConfig, deviceTree, true);


describe('Queue Client Tests', () => {
    it('connectGreenQ : Connect to public Green Queue [mock config]', () => {
        queueClient.connectGreenQ((data) => {
            expect(data.Success).to.equal(true)
        })
    });
});