<script>
    //import * as fs from "fs";

    import { relayInit, getEventHash, signEvent } from "nostr-tools";

    import { bech32encode } from "../lib/bech32";

    /**
     * @type {string[][]}
     */
    export let bookmarkList;

    let relayName = "wss://nostream.localtest.me/"; //"wss://relay.damus.io";
    let copyRelayName = "wss://nostream.localtest.me/";
    let connectMessage = "";
    let connectMessage2 = "";
    let pubkey =
        "npub12egp0pvh2f0fp6sk5nt6ncehqzkz8zsma8dl8agf8p3f98v6resqku4w26";
    //"npub1sjcvg64knxkrt6ev52rywzu9uzqakgy8ehhk8yezxmpewsthst6sw3jqcw";
    let author = "";
    let bookmark1_length=0;
    let isView=false;
    async function clickButton() {
        isView=false;
        bookmark1_length=0;
        bookmarkList = [];
        connectMessage = "通信中";
        relayName = relayName.trim(); //空白除去
        let str = relayName.slice(0, 6); //始まりがwss://かチェック

        if (str !== "wss://") {
            alert("wss://〜〜を入力してください");
            return;
        } else {
            const relay = relayInit(relayName);
            try {
                const isConnect = await ConnectRelay(relay);
                if (!isConnect) {
                    connectMessage = `failed to connect to ${relayName}`;
                    return;
                } else {
                    //-----以下コネクト成功-------
                    //------ブクマ取得＆表示------
                    connectMessage = `connected to ${relayName}`;

                    author = pubkey;

                    if (pubkey.slice(0, 4) === "npub") {
                        console.log("バブキーヘックスに変換");
                        try {
                            author = bech32encode(pubkey);
                        } catch (error) {
                            connectMessage = "公開鍵が正しいか確認してください";
                            return;
                        }
                    }
                }
            } catch (error) {
                connectMessage = `failed to connect to ${relayName}`;
                return;
            }

            let sub = relay.sub([
                {
                    kinds: [30001], //ブックマーク 30001
                    authors: [author],
                },
            ]);
            
            bookmarkList = await listenForEvent();
            async function listenForEvent() {
                return new Promise((resolve) => {
                    isView=true;
                    sub.on("event", (event) => {
                        bookmark1_length=event.tags.length-1;
                       if(bookmark1_length<0)bookmark1_length=0;
                        resolve(event.tags);
                        //connectMessage="";
                        
                    });
                    sub.on("eose",()=>{
                       if(bookmark1_length<=0)bookmark1_length=0;
                       // connectMessage="ブクマ保存されてないっぽい！"
                       
                    })
                });
            }
            console.log(`bookmark:${bookmarkList}`);
           

            // `bookmarkList`を使って、必要な処理を行う
        }
    }

    // @ts-ignore
    async function ConnectRelay(relay) {
        let bool = false;
        relay.on("connect", () => {
            console.log(`connected to ${relay.url}`);
            bool = true;
        });
        relay.on("error", () => {
            console.log(`failed to connect to ${relay.url}`);
            bool = false;
        });

        await relay.connect();
        return bool;
    }

    //------------------------------------------------
    async function clickCopyButton() {
        //リレーにつなぐ
        const relay2 = relayInit(copyRelayName);
        try {
            await ConnectRelay(relay2);
            connectMessage2 = `connected to ${copyRelayName}`;
            await publishEvent(relay2);
        } catch (error) {
            connectMessage2 = `failed to connect to ${copyRelayName}`;
            return;
        }

        // @ts-ignore
        async function publishEvent(relay2) {
            //署名してコピー
            // @ts-ignore
            const event = await window.nostr.signEvent({
                kind: 30001,
                pubkey: author,
                created_at: Math.floor(Date.now() / 1000),
                tags: bookmarkList,
                content: "",
            });
            event.id = getEventHash(event);
            let pub = relay2.publish(event);
            pub.on("ok", () => {
                console.log(`${relay2.url} has accepted our event`);
                connectMessage2 = `${relay2.url} has accepted our event`;
            });
            // @ts-ignore
            pub.on("failed", (reason) => {
                console.log(`failed to publish to ${relay2.url}: ${reason}`);
                connectMessage2 = `failed to publish to ${relay2.url}: ${reason}`;
            });
        }
    }
</script>

<!-------------------------------------------------------------------->
<main>
<h2>消えたブックマークを取り戻せ</h2>
<p>kind:30001に保存されている公開ブックマークをリレーからリレーに移植</p>
<ul>
    <li>自分の公開鍵、ブックマークが残っていそうなリレーを入力</li>
    <li>
        拡散したい（上書きしたい）リレーを選択して、保存<br />
        署名するためにnip-7拡張機能を使います<br />
    </li>
    </ul>

<!-------------------------------------------------------------------->
<div class = "content">
    pubkey:
    <input
        type="text"
        bind:value={pubkey}
        placeholder="ブクマ確認したい人のnpubかhexたぶんどっちでもおけ"
        style="min-width:600px"
    />

    relay:
    <input
        type="text"
        bind:value={relayName}
        placeholder="wss://..."
        style="min-width:350px"
    />

   
<button on:click={clickButton}> BookmarkListを取得</button>
</div>
<hr/>
<p>{connectMessage}</p>
<!-------------------------------------------------------------------->
<!--{#if bookmarkList != null}-->
{#if !isView}
<div id="bookmarkList"/>
{/if}
{#if isView}
<div id = "bookmarkList">  
<p>
        ブックマーク件数:{bookmark1_length}
    </p>
  
     <!-------------------------------------------------------------------->
     <details>
        <summary>イベントIDリスト</summary>
        <ul class="bcmList">
            {#each bookmarkList.slice(1)  as bookmark}
                <li>{bookmark[1]}</li>
            {/each}
        </ul>
    </details>
    
    <!----別のリレーへ-------------------------------------------------------->
    <hr/>
    <div class = "content">
        to relay:
        <input
            type="text"
            bind:value={copyRelayName}
            placeholder="wss://..."
            style="min-width:250px"
        />
    </div>
    <button on:click={clickCopyButton}>
        {copyRelayName}に上書き保存</button>
        {#if connectMessage2.length==0}
        <div style="margin:50px"/>
        {/if}
    <p>{connectMessage2}</p>
   <hr/>
</div>


{/if}

</main>
<!---------------------------------------------------------->
<style>
    hr {
        margin: 20px 0;
      }
  
    
button{
    font-size:medium;
    display: block;
    padding: 10px;
    margin: 20px 5px 20px 5px;
    border: solid 1px lightgray;
    cursor: pointer;
}
.content {
    margin-top: 10px;
    margin-left: 10px;
    white-space: pre-line;
  }
  input{
    font-size: medium;
    padding:10px 10px 5px 10px ;
    margin:5px;
  }
  .bcmList{
    list-style:decimal-leading-zero;
    
    }
   
</style> 
