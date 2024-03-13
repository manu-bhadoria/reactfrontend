import React from 'react';
import './App.css';
import { ContractPromise } from '@polkadot/api-contract';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { BN, BN_ONE } from '@polkadot/util';
import type { WeightV2, Weight, ContractExecResult } from '@polkadot/types/interfaces';
import { AbiMessage, ContractOptions } from "@polkadot/api-contract/types";
import { useState } from 'react';

import amailMetadata from './metadata/amail.json';

import {
    web3Enable,
    web3Accounts,
    web3FromSource
  } from "@polkadot/extension-dapp";


function App() {
  type InjectedAccountWithMeta = Awaited<ReturnType<typeof web3Accounts>>[number];
  type InjectedExtension = Awaited<ReturnType<typeof web3Enable>>[number];
  type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

  const APP_NAME = 'local';
  const [extensions, setExtensions] = useState<InjectedExtension[]>([]);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);

  const handleClick = (buttonNumber: number) => {
    console.log(`Button ${buttonNumber} clicked`);
  };

  const toContractAbiMessage = (
    contractPromise: ContractPromise,
    message: string
  ): Result<AbiMessage, string> => {
    const value = contractPromise.abi.messages.find((m) => m.method === message);
  
    if (!value) {
      const messages = contractPromise?.abi.messages
        .map((m) => m.method)
        .join(", ");
  
      const error = `"${message}" not found in metadata.spec.messages: [${messages}]`;
      console.error(error);
  
      return { ok: false, error };
    }
  
    return { ok: true, value };
  };

  const getGasLimit = async (
    api: ApiPromise,
    userAddress: string,
    message: string,
    contract: ContractPromise,
    options = {} as ContractOptions,
    args = [] as unknown[]
    // temporarily type is Weight instead of WeightV2 until polkadot-js type `ContractExecResult` will be changed to WeightV2
  ): Promise<Result<Weight, string>> => {
    const abiMessage = toContractAbiMessage(contract, message);
    if (!abiMessage.ok) return abiMessage;
  
    const { value, gasLimit, storageDepositLimit } = options;
  
    const { gasConsumed, gasRequired, storageDeposit, debugMessage, result } =
      await api.call.contractsApi.call<ContractExecResult>(
        userAddress,
        contract.address,
        value ?? new BN(0),
        gasLimit ?? null,
        storageDepositLimit ?? null,
        abiMessage.value.toU8a(args)
      );
   
    return { ok: true, value: gasRequired };
  };

  const createPhrase = (content: string): string => {
    var contentHedge = content.replace(/[^\w]/g,'');
    var charsArray =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var lengthPhrase = 36;

    var phrase = "";
    for (var i = 0; i < lengthPhrase; i++) {
        var index = Math.floor(Math.random() * charsArray.length); 
        phrase = phrase.concat(charsArray[index]);
    }

    
    var i = 0;
    while (i < contentHedge.length && i < phrase.length){
        var c = contentHedge.charAt(i);
        if (i % 2 != 0){
          phrase = phrase.substring(0, i) + c + phrase.substring(i+1)
        }
        i += 1;
    }


    
    return phrase;
}

  
const createMail = async (content: string): Promise<void> => {
  const injectedExtensions = await web3Enable(APP_NAME);
  setExtensions(injectedExtensions);

  const accounts = await web3Accounts(
    { extensions: ["aleph-zero-signer"] }
  );
  
  setAccounts(accounts);
  //console.log(accounts);
  //console.log(injectedExtensions);

  const userAccount = accounts[0];
  const injector = await web3FromSource(userAccount.meta.source);
  console.log(injector);
  //if (!userAccount.meta.source) return;

  const APP_PROVIDER_URL = "wss://ws.test.azero.dev";

    const wsProvider = new WsProvider(APP_PROVIDER_URL);
    const api = await ApiPromise.create({ provider: wsProvider });
    const address = '5FD5srm77hfrsE9K79Fot7LxPpVzBnVM3JbnjuC2b2AHCtcf';

  const contract = new ContractPromise(
    api,
    amailMetadata,
    address
  );

  const date = new Date();
  const now = Math.floor(date.getTime()/1000);
  const mail_id = userAccount.address.toString().concat('@').concat(now.toString());
  console.log(mail_id);
  const phr = createPhrase(content);
  console.log(phr);
  
  
  const to = '5CfEVT4RFuCrhYYPBvCVwgFGMukwwvJGFhwLbTecvoVf6Uvz';
  const mailId = mail_id;//'mail_frontend';
  const phrase = 'trialanderror';
  const gasLimitResult = await getGasLimit(
    api,
    userAccount.address,
    "sendMail",
    contract,
    {},
    [to, mailId, phrase]
  );

  if (!gasLimitResult.ok) {
    console.log(gasLimitResult.error);
    return;
  }

  const { value: gasLimit } = gasLimitResult;

  const tx = contract.tx.sendMail(
    {
      gasLimit,
    },
    to,
    mailId,
    phrase
  );
  await tx
    .signAndSend(
      userAccount.address,
      { signer: injector.signer },
      ({ events = [], status }) => {
        events.forEach(({ event }) => {
          const { method } = event;
          if (method === "ExtrinsicSuccess" && status.type === "InBlock") {
            console.log("Success!");
          } else if (method === "ExtrinsicFailed") {
            console.log(`An error occured: ${method}.`);
          }
        });
      }
    )
    .catch((error) => {
      console.log(`An error occured: ${error}.`);
    });


 
};

  const fetchPartialEncr = async (mid: string) => {
    const APP_PROVIDER_URL = "wss://ws.test.azero.dev";

    const wsProvider = new WsProvider(APP_PROVIDER_URL);
    const api = await ApiPromise.create({ provider: wsProvider });
    const address = '5FD5srm77hfrsE9K79Fot7LxPpVzBnVM3JbnjuC2b2AHCtcf';


    const contract = new ContractPromise(
        api,
        amailMetadata,
        address
      );

      const MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE);

      const readOnlyGasLimit = api.registry.createType('WeightV2', {
          refTime: new BN(1_000_000_000_000),
          proofSize: MAX_CALL_WEIGHT,
        }) as WeightV2;


      const caller = '5CfEVT4RFuCrhYYPBvCVwgFGMukwwvJGFhwLbTecvoVf6Uvz' ;

      const res2 = await contract.query.getAlgosAndMask(
        caller,
        {
          gasLimit: readOnlyGasLimit,
        },
        [mid]
      );
      if (res2.result.isOk && res2.output) {
        console.log(res2.output.toHuman());
      }
      if (res2.result.isErr) {
        console.log(res2.result.toHuman());
      }

  }

  const fetchContacts = async () => {
    const APP_PROVIDER_URL = "wss://ws.test.azero.dev";

    const wsProvider = new WsProvider(APP_PROVIDER_URL);
    const api = await ApiPromise.create({ provider: wsProvider });
    const address = '5FD5srm77hfrsE9K79Fot7LxPpVzBnVM3JbnjuC2b2AHCtcf';


    const contract = new ContractPromise(
        api,
        amailMetadata,
        address
      );

      const MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE);

      const readOnlyGasLimit = api.registry.createType('WeightV2', {
          refTime: new BN(1_000_000_000_000),
          proofSize: MAX_CALL_WEIGHT,
        }) as WeightV2;


      const caller = '5CfEVT4RFuCrhYYPBvCVwgFGMukwwvJGFhwLbTecvoVf6Uvz' ;
      const {
        gasConsumed,
        gasRequired,
        storageDeposit,
        result,
        output,
        debugMessage,
      } = await contract.query.getReceivedMail(
        caller, // caller address
        {
          gasLimit: readOnlyGasLimit,
        }
        
      );
      console.log(contract.query);
      if (result.isOk && output) {
        console.log(output.toHuman());
      }
      if (result.isErr) {
        console.log(result.toHuman());
      }
      
  }

  return (
    <div className="App">
      <header className="App-header">
        <p>
          Click any button:
        </p>
        <button onClick={() => createMail('This is a very nice mail. Hope you enjoy it.')}>Create</button>
        <button onClick={() => fetchPartialEncr('mail02')}>Encryption</button>
        <button onClick={() => fetchContacts()}>Contacts</button>
      </header>
    </div>
  );
}

export default App;
