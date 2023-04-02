<script>
    //import * as fs from "fs";

    import { relayInit, getEventHash, signEvent } from "nostr-tools";

    import { bech32encode } from "../lib/bech32";

    /**
     * @type {string | any[]}
     */
    let bookmarkList=[];

    let relayName = "wss://nostream.localtest.me/"; //"wss://relay.damus.io";
    let copyRelayName = ""; //"wss://nostream.localtest.me/";
    let connectMessage = "";
    let connectMessage2 = "";
    let pubkey = "";
    let errorMessage = "";
    let errorMessage2 = "";

    // "npub12egp0pvh2f0fp6sk5nt6ncehqzkz8zsma8dl8agf8p3f98v6resqku4w26";
    //"npub1sjcvg64knxkrt6ev52rywzu9uzqakgy8ehhk8yezxmpewsthst6sw3jqcw";
    let author = "";
    let bookmark1_length = 0;
    let isView = false;
    async function clickButton() {
        isView = false; //一旦結果表示の部分非表示に
        bookmark1_length = 0;
        errorMessage = "";
        errorMessage2="";
        bookmarkList = [];
        connectMessage = "通信中";
        relayName = relayName.trim(); //空白除去
        let str = relayName.slice(0, 6); //始まりがwss://かチェック

        const relay = relayInit(relayName);

        const connect_obj = await ConnectRelay(relay);
        if (!connect_obj.success) {
            errorMessage = connect_obj.message;
            return;
        }
        //-----以下コネクト成功-------
        //------ブクマ取得＆表示------
        connectMessage = connect_obj.message;
        author=pubkey;
        if ( pubkey.slice(0, 4) === "npub") {
            const pub_obj = CreateHex(author);
            if (!pub_obj.isSuccess) {
                errorMessage2 = pub_obj.connectMessage;
                return;
            } else{author=pub_obj.author;}
        }

        bookmarkList = await listenForEvent(relay);
        
        console.log(`bookmark:${bookmarkList}`);

        // `bookmarkList`を使って、必要な処理を行う
    }

    /**
     * @param {import("nostr-tools").Relay} relay
     */
    async function listenForEvent(relay) {
        let sub = relay.sub([
            {
                kinds: [30001], //ブックマーク 30001
                authors: [author],
            },
        ]);
            return new Promise((resolve) => {
                isView = true;
                sub.on("event", (event) => {
                    bookmark1_length = event.tags.length - 1;
                    if (bookmark1_length < 0) {
                        bookmark1_length = 0;
                        errorMessage2="ブクマ保存されてないっぽい！";
                    }
                    resolve(event.tags);
                    
                    //connectMessage="";
                });
                sub.on("eose", () => {
                    if (bookmark1_length <= 0) {
                        bookmark1_length = 0;
                        errorMessage2="ブクマ保存されてないっぽい！";
                    
                    }
                    // connectMessage="ブクマ保存されてないっぽい！"
                });
            });
        }
    // @ts-ignore
    async function ConnectRelay(relay) {
        let bool = false;
        let message = "";
        try {
            relay.on("connect", () => {
                bool = true;
                message = `connected to ${relay.url}`;
                console.log(message);
            });
            relay.on("error", () => {
                bool = false;
                message = `failed to connect to ${relay.url}`;
                console.log(message);
            });

            await relay.connect();
        } catch (error) {
            bool = false;
            message = `リレーが見つかりません。リレーアドレスを確認してください`;
            console.log(message);
        }
        return {
            success: bool,
            message: message,
        };
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

    /**
     * @param {string} pubkey
     */
    function CreateHex(pubkey) {
        let isSuccess = false;
        let connectMessage = "";

        console.log("バブキーヘックスに変換");
        try {
            author = bech32encode(pubkey);
            isSuccess = true;
        } catch (error) {
            isSuccess = false;
            connectMessage = "公開鍵が正しいか確認してください";
        }

        return { isSuccess, author, connectMessage };
    }
</script>

<!-------------------------------------------------------------------->
<main>
    
    <h2>Nostrのブックマークのバックアープ</h2>
    <div class = "gaiyou">
    <p>kind:30001に保存されている公開ブックマークをリレーからリレーに移植</p>
    <ul>
        <li>自分の公開鍵、適当なリレーURLを入れて、そのリレーに保存されているブックマークを取得</li>
        <li>
            拡散したい（上書きしたい）リレーを選択して、保存</li> 
            <li>署名するためにnip-7拡張機能を使います
        </li>
        <li>
            たまに普段使わないリレーに送信しておいたりしたらいいかもしれません 
    </li>
    </ul>
</div>
    <!-------------------------------------------------------------------->
    <div class="content">
        pubkey:
        <input
            type="text"
            bind:value={pubkey}
            placeholder="npub or hex"
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
    <hr />
    {#if errorMessage.length > 0}
        <div class="error-message">{errorMessage}</div>
    {/if}
    {#if errorMessage.length == 0}
        <div class="message">{connectMessage}</div>
    {/if}
    {#if errorMessage2.length > 0}
        <div class="error-message">{errorMessage2}</div>
    {/if}
    <!-------------------------------------------------------------------->
    <!--{#if bookmarkList != null}-->
    {#if !isView}
        <div id="bookmarkList" />
    {/if}
    {#if isView }
        <div id="bookmarkList">
            <p>
                ブックマーク件数:{bookmark1_length}
            </p>

            <!-------------------------------------------------------------------->
            {#if bookmark1_length>0}
            <details>
                <summary>イベントIDリスト</summary>
                <ul class="bcmList">
                    {#each bookmarkList.slice(1) as bookmark}
                        <li>{bookmark[1]}</li>
                    {/each}
                </ul>
            </details>

            <!----別のリレーへ-------------------------------------------------------->
            <hr />
            <div class="content">
                to relay:
                <input
                    type="text"
                    bind:value={copyRelayName}
                    placeholder="wss://..."
                    style="min-width:250px"
                />
            </div>
            <button on:click={clickCopyButton}>
                {copyRelayName}に上書き保存</button
            >
            {#if connectMessage2.length == 0}
                <div style="margin:50px" />
            {/if}
            <p>{connectMessage2}</p>
            <hr />
            {/if}
        </div>
  
    {/if}
</main>

<!---------------------------------------------------------->
<style>
    .error-message {
        color: red;
    }
    hr {
        margin: 20px 0;
    }

    button {
        font-size: medium;
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
    input {
        font-size: medium;
        padding: 10px 10px 5px 10px;
        margin: 5px;
    }
    .bcmList {
        list-style: decimal-leading-zero;
    }
    .gaiyou{
      margin: 10px ;
      margin-bottom: 15px;
      padding: 5px 15px 5px 15px;
        border: solid 1px lightgray;
    }
</style>
