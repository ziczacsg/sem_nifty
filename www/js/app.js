var appKey    = "50c4665dd1732f5f7d2b261a06354ad3e35b62dca765348004b5d6c0891ce826";
var clientKey = "4b420c1455cf66619a81894a230f28b216ddd6ca32ce6470bcaa2406a473c18a";
var applicationID = "0EfkpbgYoIZYNFd7";// On url mobi backend app
var ncmb = new NCMB(appKey,clientKey);

///// Called when app launch
$(function() {
  $("#LoginBtn").click(onLoginBtn);
  $("#RegisterBtn").click(onRegisterBtn);
  $("#YesBtn_logout").click(onLogoutBtn);
  $("#UseBtn").click(onUseBtn);
});

//----------------------------------会員管理-----------------------------------//
var currentLoginUser; //現在ログイン中ユーザー
var currentShopId; //現在詳細ページを表示するお店

function onRegisterBtn()
{
    //STEP1 コード追加（register）
    //入力フォームからusername, password変数にセット
    var username = $("#reg_username").val();
    var password = $("#reg_password").val();

    var user = new ncmb.User();
    user.set("userName", username)
        .set("password", password);

    // 任意フィールドに値を追加 
    user.signUpByAccount()
        .then(function(user) {
            alert("新規登録に成功");
            currentLoginUser = ncmb.User.getCurrentUser();
            $.mobile.changePage('#MapPage');
        })
        .catch(function(error) {
            alert("新規登録に失敗！次のエラー発生：" + error);
        });
}

function onLoginBtn()
{
    //STEP1 コード追加（login）
    var username = $("#login_username").val();
    var password = $("#login_password").val();
    // ユーザー名とパスワードでログイン
    ncmb.User.login(username, password)
        .then(function(user) {
            alert("ログイン成功");
            currentLoginUser = ncmb.User.getCurrentUser();
            $.mobile.changePage('#MapPage');
        })
        .catch(function(error) {
            alert("ログイン失敗！次のエラー発生: " + error);
        });
}

function onLogoutBtn()
{
    //STEP1 コード追加(logout)
    ncmb.User.logout();
    alert('ログアウト成功');
    currentLoginUser = null;
    $.mobile.changePage('#LoginPage');
}

//---------------------------------地図でお店表示---------------------------//

//現在地を取得成功したら
var onSuccess = function(position){
    var location = { lat: position.coords.latitude, lng: position.coords.longitude};
    //mobile backendに登録しているストアを取得し、地図で表示
    var ShopClass = ncmb.DataStore("Shop");
    //位置情報をもとに検索する条件を設定
    var geoPoint = new ncmb.GeoPoint(location.lat, location.lng);
    var mapOptions = {
                       center: location,
                       zoom: 14
                     };
    var map = new google.maps.Map(document.getElementById('map_canvas'),mapOptions);
    //現在地を地図に追加
    markToMap("現在地", location, map, null);
    //mobile backend上のデータ検索を実行する
    ShopClass.withinKilometers("geolocation", geoPoint, 5)
             .fetchAll()
             .then(function(shops) { 
                // 検索が成功した場合の処理
                for (var i = 0; i < shops.length; i++){
                    var shop = shops[i];
                    var shopLocation = shop.get("geolocation");              
                    var myLatlng = new google.maps.LatLng(shopLocation.latitude, shopLocation.longitude);
                    var detail = "";
                    var shopName = shop.get("name");
                    detail += "<h2>"+ shopName +"</h2>";
                    var shopLocation = shop.get("geolocation");
                    var shopCoupon = shop.get("provideCoupon");
                    var shopLatLng = new google.maps.LatLng(shopLocation.latitude,shopLocation.longitude);
                    var locationLatLng = new google.maps.LatLng(location.lat,location.lng);
                    var distance = Math.round(google.maps.geometry.spherical.computeDistanceBetween (locationLatLng, shopLatLng));  
                    detail += "<p>距離: "+ distance + "(m)</p>";
                    detail += '<button onclick="showShop(\'' + shop.objectId + '\');">お店を見る</button>';
                    markToMap(detail, myLatlng, map, 'images/marker.png');     
                }
             })
             .catch(function(error) {
                // 検索に失敗した場合の処理
                alert(error.message);
             });
};

//位置情報取得に失敗した場合のコールバック
var onError = function(error){
    alert("現在位置を取得できませんでした");
};

//地図でマーク表示
function markToMap(name, position, map, icon){
    var marker = new google.maps.Marker({
        position: position,
        title:name,
        icon: icon
    });
    marker.setMap(map);
    google.maps.event.addListener(marker, 'click', function() {
        var infowindow = new google.maps.InfoWindow({
            content:marker.title
        });
        infowindow.open(map,marker);
    });
}

//現在地を取得する
function showMap(){
    navigator.geolocation.getCurrentPosition(onSuccess, onError, null);
};


//----------------------------------利用状況の表示-------------------------------------//

function getShopDetail(shopId) {   
    var ShopClass = ncmb.DataStore("Shop");
    ShopClass.fetchById(shopId)
        .then(function(shop) {
            $("#shopName").text(shop.get("name"));
            $("#shopCapacity").text("スペース：" + shop.get("capacity") + "席");
            $("#shopImage").attr("src" , "https://mb.api.cloud.nifty.com/2013-09-01/applications/" + applicationID + "/publicFiles/" + shop.get("image"));
            var UseClass = ncmb.DataStore("Used");
            UseClass
                    .equalTo("shop", shopId)
                    .equalTo("user", currentLoginUser.objectId)
                    .count()
                    .fetchAll()
                    .then(function(results) {
                          if(results.count>0) {
                            $("#shopUsage").text("今まで" + results.count + "回で利用いただきました。" );
                          } else {
                            $("#shopUsage").text("まだ利用していません。" );   
                          }
                    })
                    .catch(function(error) {
                        // エラー
                    });    
        })
        .catch(function(error) {
            alert(error.message);
        });          
}

function showShop(shopId) {
    currentShopId = shopId;
    getShopDetail(shopId);
    $.mobile.changePage('#ShopPage');
}

function onUseBtn() {
    var UseClass = ncmb.DataStore("Used");
    var used = new UseClass();
    used.set("shop", currentShopId)
        .set("user", currentLoginUser.objectId)
        .save()
        .then(function(obj) {
            // 保存完了後に実行される
            alert("利用登録完了！");
            getShopDetail(currentShopId);
        })
        .catch(function(error) {
            // エラー時に実行される
            alert("登録失敗！次のエラーが発生：" + error.message);
        });
}