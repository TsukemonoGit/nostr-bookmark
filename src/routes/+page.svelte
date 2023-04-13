<script>
    //import * as fs from "fs";

    import { relayInit, getEventHash, signEvent, nip19 } from "nostr-tools";

    import { bech32encode } from "../lib/bech32";

    /**
     * @type {import("nostr-tools").Event}
     */
    let bookmarkListObj;

    /**
     * @type {string | any[]}
     */
    let bookmarkList;
    /**
     * @type {string[]}
     */
    let bookmarkIDs;
    /**
     * @type {any[]}
     */
    let bookmarkEvents = [];
    /**
     * @type {string[]}
     */
    let bookmarkContents;
    let category = "bookmark";
    let relayName = ""; //"wss://relay.nostrich.land"; //"wss://nostream.localtest.me/"; //"wss://relay.damus.io";
    let copyRelayName = ""; //"wss://nostream.localtest.me/";
    let connectMessage = "";
    let connectMessage2 = "";
    let pubkey = "";
    //"npub1sjcvg64knxkrt6ev52rywzu9uzqakgy8ehhk8yezxmpewsthst6sw3jqcw";
    let errorMessage = "";
    let errorMessage2 = "";
    let errorMessage3 = "";

    // "npub12egp0pvh2f0fp6sk5nt6ncehqzkz8zsma8dl8agf8p3f98v6resqku4w26";
    //"npub1sjcvg64knxkrt6ev52rywzu9uzqakgy8ehhk8yezxmpewsthst6sw3jqcw";
    let author = "";
    let bookmark1_length = 0;
    let isView = false;

    //イベント内容検索用リレーたち
    let RelaysforSeach = [
        "wss://nostr.wine",
        "wss://universe.nostrich.land/",
        "wss://relay.damus.io",
    ];
    //ブックマークを取得ボタン
    async function clickButton() {
        //Naddrキーを作る
        CreateNaddr();
        //各値初期化
        isView = false; //一旦結果表示の部分非表示に
        bookmark1_length = 0;
        errorMessage = "";
        errorMessage2 = "";
        errorMessage3 = "";
        connectMessage2 = "";
        bookmarkList = [];
        bookmarkIDs = [];
        bookmarkContents = [];
        bookmarkEvents = [];

        connectMessage = "通信中";
        relayName = relayName.trim(); //空白除去

        const relay = relayInit(relayName);

        const connect_obj = await ConnectRelay(relay);
        if (!connect_obj.success) {
            errorMessage = connect_obj.message;
            return;
        }
        //-----以下コネクト成功-------
        //------ブクマ取得＆表示------
        connectMessage = connect_obj.message;
        author = pubkey;
        if (pubkey.slice(0, 4) === "npub") {
            const pub_obj = CreateHex(author);
            if (!pub_obj.isSuccess) {
                errorMessage2 = pub_obj.connectMessage;
                return;
            } else {
                author = pub_obj.author;
            }
        }

        bookmarkListObj = await listenForEvent(relay);
        bookmarkList = bookmarkListObj.tags;
        //
        //console.log(`bookmark:${bookmarkListObj}`);
        //console.log(`bookmarkList.tags${bookmarkList}`)
        //----------------------------------------------------リストの各IDから各イベントを取得しに行く
        //まず形を整える
        //ids:["あいでぃー","ID2","ID3",...]の形にする
        if (bookmark1_length <= 0) return;
        const bookmarkObjs = bookmarkList.slice(1);
        const bookmarkS = bookmarkObjs.map((tag) => tag[1]);
        //   console.log(bookmarkS);
        //const test = bookmarks[1][1];

        //console.log(sub);
        const result = await getEventList(bookmarkS);
        console.log(`リザルトのとのイベントのながさ${result.events.length}`);
        bookmarkEvents = JSON.parse(JSON.stringify(result.events));
        bookmarkContents = result.events.map(
            (/** @type {{ content: string; }} */ e) => e.content
        );
        console.log(
            `ぶっくまーくこんてんとのながあさ${bookmarkContents.length}`
        );
        //  bookmarkIDs = result.events
        //     .map((/** @type {{ id: string; }} */ e) => nip19.noteEncode(e.id))
        //     .concat(result.bookmarkCount.map((e) => nip19.noteEncode(e)));
        bookmarkIDs = result.bookmarkCount.map((e) => nip19.noteEncode(e));
    }

    //----------------------------------------------clickButton
    function CreateNaddr(){
         /**
     * @type {import("nostr-tools/lib/nip19").AddressPointer }
     */
        const address=   {
            identifier: category,
            pubkey: pubkey,
            kind: 30001
        }
        const naddr = nip19.naddrEncode(address)
        console.log(naddr)
        console.log("↓naddrデコード↓")
        console.log(nip19.decode(naddr));
    }
    /**
     * @param {string[] } bookmarkS
     */
    async function getEventList(bookmarkS) {
        /**
         * @type {string | import("nostr-tools").Filter[]}
         */
        let sub = [{ ids: [] }];

        /**
         *
         */

        let events = [];
        const maxLoop = 10;
        let imakoko = bookmarkS.length;
        let bookmarkCount = bookmarkS;
        //イベント内容取得用のリレーにつなぐ
        //let index=0;

        for (let j = 0; j < RelaysforSeach.length; j++) {
            let relay = relayInit(RelaysforSeach[j]);
            const connect_obj = await ConnectRelay(relay);
            if (!connect_obj.success) {
            } else {
                for (let i = 0; i < maxLoop; i++) {
                    sub[0].ids = bookmarkCount;
                    // @ts-ignore
                    let subb = relay.sub(sub);

                    const result = await getEventwithCount(
                        subb,
                        bookmarkCount,
                        events
                    );
                    bookmarkCount = result.bookmarkCount;
                    console.log(`いまここ${bookmarkCount.length}`);
                    events = result.events;
                    if (bookmarkCount.length === 0) {
                        console.log("イベント全部取れたよ");
                        break;
                    } else if (bookmarkCount.length === imakoko) {
                        console.log(
                            "イベント全部取れてないけどこのリレーにはもうないかも??"
                        );
                        break;
                    }
                    imakoko = bookmarkCount.length;
                    //console.log(`いまここ：${imakoko}`)
                }
            }
        }
        console.log("↓イベントの中身↓");
        console.log(events); //←ここにはちゃんと全部入ってるように見える
        console.log(`リターンする前のイベントの長さ${events.length}`); //これはなんか短く表示される
        console.log(JSON.parse(JSON.stringify(events)));
        // events=JSON.parse(JSON.stringify(events));
        // bookmarkCount = JSON.parse(JSON.stringify(events));
        console.log(bookmarkCount);
        //  return { events, bookmarkCount };
        return { events, bookmarkCount };
    }
    /**
     * @param {string[]} bookmarkCount
     * @param {import("nostr-tools").Event[]} events
     */
    // @ts-ignore
    async function getEventwithCount(subb, bookmarkCount, events) {
        const result = new Promise((resolve) => {
            //setTimeoutの戻り値を保持する
            const timeoutID = setTimeout(() => {
                resolve({ bookmarkCount, events });
            }, 3000); //とりあえずeose受け取れなくても終わるように

            subb.on(
                "event",
                (/** @type {import("nostr-tools").Event}*/ event) => {
                    //   console.log("we got the event we wanted:", event);

                    bookmarkCount.forEach(function (element, index) {
                        if (event.id === element) {
                            events.push(event);
                            bookmarkCount.splice(index, 1);
                        }
                    });
                }
            );

            subb.on("eose", () => {
                console.log(`eose:${bookmarkCount.length}`);
                subb.unsub(); //イベントの購読を停止
                clearTimeout(timeoutID); //settimeoutのタイマーより早くeoseを受け取ったら、setTimeoutをキャンセルさせる。
                resolve({ bookmarkCount, events });
            });
        });
        return result;
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
                console.log(event);
                if (event.tags[0][1] === category) {
                    bookmark1_length = event.tags.length - 1;
                    if (bookmark1_length < 0) {
                        bookmark1_length = 0;
                        errorMessage2 = "ブクマ保存されてないっぽい！";
                    }
                    resolve(event);
                }
                //connectMessage="";
            });
            sub.on("eose", () => {
                sub.unsub();
                // if (bookmark1_length <= 0) {
                //     bookmark1_length = 0;
                //     errorMessage2 = "ブクマ保存されてないっぽい！";
                // }
            });
        });
    }
    // @ts-ignore
    async function ConnectRelay(relay) {
        let bool = false;
        let message = "";
        try {
            await relay.connect();
        } catch (error) {
            bool = false;
            message = `リレーが見つかりません。アドレスを確認してください`;
            console.log(message);
        }

        const result = new Promise((resolve) => {
            //setTimeoutの戻り値を保持する
            const timeoutID = setTimeout(() => {
                resolve({
                    success: bool,
                    message: message,
                });
            }, 10000); //とりあえずeose受け取れなくても終わるように(結構時間かかるときはかかるっぽいのでとりあえず10秒)

            relay.on("connect", () => {
                bool = true;
                message = `connected to ${relay.url}`;
                console.log(message);
                resolve({
                    success: bool,
                    message: message,
                });
            });
            relay.on("error", () => {
                bool = false;
                message = `failed to connect to ${relay.url}`;
                console.log(message);
                clearTimeout(timeoutID); //settimeoutのタイマーより早くeoseを受け取ったら、setTimeoutをキャンセルさせる。
                resolve({
                    success: bool,
                    message: message,
                });
            });
        });

        return result;
    }

    //------------------------------------------------
    async function clickCopyButton() {
        //メッセージリセット
        errorMessage3 = "";
        connectMessage2 = "";
        //リレーにつなぐ
        const relay2 = relayInit(copyRelayName);
        const result = await ConnectRelay(relay2);
        if (!result.success) {
            errorMessage3 = "リレーへの接続に失敗しました";
            return;
        }
        //コネクト成功
        connectMessage2 = `connected to ${copyRelayName}`;
        await publishEvent(relay2);

        // @ts-ignore
        async function publishEvent(relay2) {
            //署名してコピー
            // @ts-ignore
            try {
                // @ts-ignore
                const event = await window.nostr.signEvent({
                    content: bookmarkListObj.content,
                    kind: 30001,
                    pubkey: author,
                    created_at: Math.floor(Date.now() / 1000),
                    tags: bookmarkListObj.tags,
                });

                event.id = getEventHash(event);
                let pub = relay2.publish(event);
                connectMessage2 = "通信中";
                pub.on("ok", () => {
                    console.log(`${relay2.url} has accepted our event`);
                    connectMessage2 = `${relay2.url} has accepted our event`;
                });
                // @ts-ignore
                pub.on("failed", (reason) => {
                    console.log(
                        `failed to publish to ${relay2.url}: ${reason}`
                    );
                    errorMessage3 = `failed to publish to ${relay2.url}: ${reason}`;
                });
            } catch (error) {
                errorMessage3 = "拡張機能の要求が拒否されました";
                return;
            }
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

    //-拡張機能からpubkey取得
    async function clickGetPubkeyButton() {
        isView = false; //一旦結果表示の部分非表示に
        bookmark1_length = 0;
        errorMessage = "";
        errorMessage2 = "";
        errorMessage3 = "";
        connectMessage = "";
        connectMessage2 = "";
        bookmarkList = [];
        try {
            // @ts-ignore
            pubkey = await window.nostr.getPublicKey();
        } catch (error) {
            errorMessage = "拡張機能読み込めなかったかも";
        }
    }
</script>

<!-------------------------------------------------------------------->
<main>
    <h2>Nostrのブックマークのバックアープ</h2>
    <div class="gaiyou">
        <p>
            <strong style="color:red"
                >開発途中です！ブクマ消失する可能性有り取り扱い注意！！</strong
            ><br />
            kind:30001に保存されている公開ブックマークをリレーからリレーに移植
        </p>
        <ul>
            <li>
                自分の公開鍵、適当なリレーURLを入れて、そのリレーに保存されているブックマークを取得
            </li>
            <li>拡散したい（上書きしたい）リレーを選択して、保存</li>
            <li>署名するためにnip-7拡張機能を使います</li>
            <li>
                たまに普段使わないリレーに送信しておいたりしたらいいかもしれません
            </li>
            <li>リレー接続Max10秒待ち</li>
            <li>
                noteIDおしたらNosTx（https://nostx.shino3.net/）が開かれるかも
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
            style="width:600px"
        />
        <!--拡張機能からpubkey取得-->
        <button on:click={clickGetPubkeyButton} style="display:inline">
            拡張機能からpubkey取得</button
        >
        <!----------------------------->
        relay:
        <input
            type="text"
            bind:value={relayName}
            placeholder="wss://..."
            style="width:350px"
        />

        取得するブックマークのカテゴリ名（デフォルトはbookmark)
        pinにするとSnortのピン留めリストがみれるよ:
        <input
            type="text"
            bind:value={category}
            placeholder="bookmark"
            style="width:350px"
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
    {#if isView}
        <div id="bookmarkList">
            <p>
                ブックマーク件数:{bookmark1_length}、{#if bookmark1_length != 0 && bookmarkContents.length == 0}通信中{/if}{#if bookmarkContents.length > 0}イベント取れた{bookmarkContents.length}{/if}
            </p>

            <!------------------------------ブックマークの内容表示のとこ------------------------>
            {#if bookmarkContents != null}
                <details>
                    <summary>イベントIDリスト</summary>
                    <ul class="bcmList">
                        <!-- {#each bookmarkList.slice(1) as bookmark}-->
                        {#each bookmarkEvents as bookmark}
                            <li class="bookmarkBox">
                                <a
                                    href="https://nostx.shino3.net/{nip19.noteEncode(
                                        bookmark.id
                                    )}"
                                    class="noteID"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    >{nip19.noteEncode(bookmark.id)}</a
                                >
                                <div class="date">
                                    [{new Date(
                                        bookmark.created_at * 1000
                                    ).toLocaleString()}]
                                </div>
                                <div class="bookmarkcontent">
                                    {bookmark.content}
                                </div>
                            </li>{/each}

                        {#each bookmarkIDs as bookmark}
                            <li class="bookmarkBox">
                                <a
                                    href="https://nostx.shino3.net/{bookmark}"
                                    class="noteID"
                                    target="_blank"
                                    rel="noopener noreferrer">{bookmark}</a
                                >
                            </li>
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

                    <button on:click={clickCopyButton}> 保存</button>
                </div>
                {#if connectMessage2.length == 0}
                    <div style="margin:50px" />
                {/if}
                {#if errorMessage3.length > 0}
                    <div class="error-message">{errorMessage3}</div>
                {/if}
                {#if errorMessage3.length == 0}
                    <div class="message">{connectMessage2}</div>
                {/if}
                <hr />
            {/if}
        </div>
    {/if}
    <hr />
    <div id="footer">
        Github: <a
            href="https://github.com/TsukemonoGit/nostr-bookmark"
            target="_blank"
            rel="noopener noreferrer">TsukemonoGit/nostr-bookmark</a
        > <br />
        Author:
        <a
            href="https://nostx.shino3.net/npub1sjcvg64knxkrt6ev52rywzu9uzqakgy8ehhk8yezxmpewsthst6sw3jqcw"
            target="_blank"
            rel="noopener noreferrer">mono(Nostr)</a
        >
    </div>
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
        padding: 5px 10px 5px 10px;
        margin: 5px;
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
        max-width: 85vw;
    }
    .bcmList {
        list-style: decimal-leading-zero;
    }
    .gaiyou {
        margin: 10px;
        margin-bottom: 15px;
        padding: 5px 15px 5px 15px;
        border: solid 1px lightgray;
    }
    #footer {
        color: rgb(70, 70, 70);
    }
    #footer a:hover {
        color: rgb(73, 73, 73);
    }
    #footer a:active,
    a:visited,
    a:link {
        color: gray;
    }
    .bookmarkBox {
        border: solid 1px lightgrey;
        margin: 10px;
        padding: 10px;
        word-wrap: break-word;
        word-break: break-all;
    }
    .bookmarkBox a:hover {
        color: rgb(134, 192, 214);
    }
    .bookmarkBox a {
        color: rgb(72, 137, 163);
    }

    .date {
        margin-left: 10px;
        display: inline-block;
        font-size: smaller;
        color: rgb(68, 68, 68);
    }
    .bookmarkcontent {
        margin-top: 10px;
        margin-left: 10px;
    }
</style>
