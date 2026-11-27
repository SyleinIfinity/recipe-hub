/**
 * Recipe Hub — 120 recipes / 10 test users / 12 categories.
 * Single-file seed for SyleinIfinity/recipe-hub, branch khanh,
 * schema checked at b1c6660239f9117fd16f9150cde0d966efe6942a.
 * Copy to backend/scripts/recipe-hub-seed.mjs, then from backend/:
 *   node scripts/recipe-hub-seed.mjs --check
 *   node --env-file=.env scripts/recipe-hub-seed.mjs --apply --limit=1
 *   node --env-file=.env scripts/recipe-hub-seed.mjs --apply
 * Requires existing backend dependencies and local recipe-hub MongoDB;
 * authenticated Cloudinary / dynamic folder mode (existing backend .env).
 * No destructive operation. Rerun after partial failure to continue. Do not run in production.
 * Dish image sources: official TheMealDB API, educational/development use.
 * https://www.themealdb.com/api.php ; https://www.themealdb.com/terms_of_use.php
 * Recipes are original, simplified Vietnamese adaptations, not tested cooking recipes.
 * Times/servings are estimates. Attribution is stored in each recipe description.
 * Each group contains ten dishes; user N gets dish N from every group.
 * Format: id or exact source name | English source name | Vietnamese title | region |
 * prep minutes | cook minutes | servings | difficulty E/M/H | short description |
 * ingredients separated by ; (name~quantity~unit OR name~text) | steps separated by ;
 */
const GROUPS = [
  ['mon-ga', 'Món gà', 'Các món gà nướng, chiên, xào và cà ri.', `
52831|Chicken Karaage|Gà chiên Karaage|Nhật Bản|35|15|3|M|Miếng gà đùi giòn nhẹ bên ngoài, mọng bên trong, thơm gừng và xì dầu.|Thịt đùi gà~500~g;Gừng~15~g;Tỏi~3~tép;Xì dầu~2~muỗng canh;Bột khoai tây~80~g;Dầu ăn~vừa đủ;Chanh~1~quả|Cắt gà thành miếng vừa ăn, thấm khô rồi ướp gừng tỏi băm và xì dầu 25 phút.;Áo từng miếng bằng bột khoai tây, rũ phần bột thừa.;Chiên từng mẻ đến vàng giòn và tâm thịt đạt 74°C, để ráo dầu.;Dùng nóng cùng chanh vắt.
52945|Kung Pao Chicken|Gà xào Kung Pao|Trung Quốc|15|15|3|M|Gà xào cay thơm với lạc rang, ớt khô và sốt chua ngọt.|Ức gà~400~g;Lạc rang~50~g;Ớt khô~4~quả;Tỏi~3~tép;Gừng~10~g;Xì dầu~2~muỗng canh;Giấm gạo~1~muỗng canh;Đường~1~muỗng cà phê;Bột bắp~1~muỗng canh;Dầu ăn~2~muỗng canh|Cắt gà hạt lựu và trộn một nửa xì dầu với bột bắp.;Phi tỏi, gừng và ớt khô, xào gà đến gần chín.;Thêm hỗn hợp xì dầu còn lại, giấm, đường và chút nước, đảo đến sánh và gà chín kỹ.;Rắc lạc rang rồi tắt bếp.
52806|Tandoori chicken|Gà nướng Tandoori|Ấn Độ|40|35|4|M|Gà tẩm sữa chua và gia vị nướng có lớp vỏ thơm, màu đỏ cam tự nhiên.|Đùi gà~700~g;Sữa chua không đường~120~g;Garam masala~2~muỗng cà phê;Bột nghệ~1~muỗng cà phê;Bột ớt~1~muỗng cà phê;Gừng~15~g;Tỏi~4~tép;Chanh~1~quả;Muối~vừa đủ|Khía nhẹ đùi gà, trộn sữa chua, gia vị, gừng tỏi và nước chanh.;Ướp gà trong tủ lạnh ít nhất 30 phút, làm nóng lò 210°C.;Nướng trên khay đến khi mặt gà xém nhẹ và tâm thịt đạt 74°C, lật giữa chừng.;Để nghỉ vài phút rồi dùng cùng chanh.
52937|Jerk chicken with rice & peas|Gà Jerk ăn cùng cơm đậu|Jamaica|30|45|4|M|Gà nướng cay thơm kiểu Jamaica, ăn với cơm nấu nước cốt dừa và đậu đỏ.|Đùi gà~600~g;Ớt~2~quả;Hành lá~3~nhánh;Tỏi~4~tép;Bột tiêu Jamaica~2~muỗng cà phê;Gạo~250~g;Đậu đỏ đã nấu chín~150~g;Nước cốt dừa~200~ml;Chanh~1~quả|Xay hành lá, ớt, tỏi, gia vị và nước chanh làm sốt ướp gà.;Nướng gà 200°C đến chín kỹ, phết phần sốt đã đun chín nếu cần.;Nấu gạo với nước cốt dừa, đậu đỏ và nước vừa đủ đến mềm.;Xới cơm, bày gà nướng bên cạnh.
52934|Chicken Basquaise|Gà hầm ớt chuông Basquaise|Pháp|15|45|4|M|Gà hầm cà chua và ớt chuông ngọt, nước sốt đậm vị rau củ.|Đùi gà~650~g;Ớt chuông đỏ~2~quả;Cà chua~400~g;Hành tây~1~củ;Tỏi~3~tép;Dầu ô liu~2~muỗng canh;Cỏ xạ hương~1~muỗng cà phê;Muối~vừa đủ|Áp chảo gà cho vàng mặt rồi lấy ra.;Xào hành, tỏi, ớt chuông thái sợi và cà chua.;Cho gà vào sốt, đậy nắp hầm lửa nhỏ đến chín kỹ.;Mở nắp cho sốt hơi sệt, nêm vừa ăn.
52832|Coq au vin|Gà hầm rượu vang đỏ|Pháp|25|70|4|H|Món gà hầm kiểu Pháp với nấm, hành củ và nước sốt vang đỏ đậm đà.|Đùi gà~700~g;Rượu vang đỏ~300~ml;Nấm mỡ~200~g;Hành tây~1~củ;Cà rốt~1~củ;Thịt xông khói~80~g;Nước dùng gà~250~ml;Bột mì~1~muỗng canh;Lá nguyệt quế~1~lá|Áp chảo thịt xông khói và gà cho vàng.;Xào hành cà rốt, rắc bột mì rồi thêm vang, nước dùng và lá nguyệt quế.;Hầm gà lửa nhỏ đến mềm và chín kỹ.;Áp chảo nấm riêng, thêm vào nồi cuối cùng và nấu sệt sốt.
52820|Katsu Chicken curry|Cơm cà ri gà Katsu|Nhật Bản|20|35|3|M|Gà tẩm bột chiên giòn dùng cùng cà ri Nhật sánh và cơm nóng.|Ức gà~450~g;Trứng gà~1~quả;Bột mì~50~g;Bột chiên xù~100~g;Hành tây~1~củ;Cà rốt~1~củ;Viên cà ri Nhật~60~g;Cơm trắng~3~bát;Dầu ăn~vừa đủ|Xào hành tây, cà rốt, thêm nước và nấu mềm rồi hòa viên cà ri.;Dần mỏng gà, áo bột mì, trứng đánh tan và bột chiên xù.;Chiên gà đến vàng giòn và chín kỹ, cắt lát.;Múc cơm ra đĩa, thêm cà ri và gà Katsu.
53192|Panang chicken curry (kaeng panang gai)|Cà ri gà Panang|Thái Lan|15|25|3|M|Cà ri gà nước cốt dừa sánh, thơm lá chanh và vị cay dịu.|Thịt đùi gà~450~g;Sốt cà ri Panang~40~g;Nước cốt dừa~400~ml;Lá chanh kaffir~4~lá;Nước mắm~1~muỗng canh;Đường thốt nốt~1~muỗng cà phê;Ớt~1~quả|Đun một phần nước cốt dừa với sốt cà ri đến thơm.;Thêm gà thái miếng, đảo đều rồi cho phần nước cốt dừa còn lại.;Nấu lửa nhỏ đến khi gà chín, nêm nước mắm và đường.;Thêm lá chanh thái sợi và ớt trước khi dùng.
53365|Chinese Orange Chicken|Gà sốt cam chua ngọt|Trung Quốc|20|20|3|M|Gà chiên áo lớp sốt cam óng, vị ngọt thanh và chua nhẹ.|Ức gà~400~g;Cam~2~quả;Bột bắp~60~g;Xì dầu~2~muỗng canh;Giấm gạo~1~muỗng canh;Đường~1~muỗng canh;Gừng~10~g;Dầu ăn~vừa đủ|Cắt gà, áo một phần bột bắp rồi chiên chín giòn.;Đun nước cam với gừng, xì dầu, giấm và đường.;Hòa bột bắp còn lại với nước, khuấy vào sốt đến sánh.;Đảo gà trong sốt nhanh tay rồi dọn nóng.
53039|Piri-piri chicken and slaw|Gà nướng Piri-piri kèm salad bắp cải|Bồ Đào Nha|25|40|4|M|Gà nướng cay thơm chanh, ăn cùng bắp cải và cà rốt trộn mát.|Đùi gà~650~g;Ớt~3~quả;Tỏi~4~tép;Chanh~1~quả;Dầu ô liu~3~muỗng canh;Bắp cải~250~g;Cà rốt~1~củ;Sữa chua không đường~80~g|Xay ớt, tỏi, nước chanh và dầu, ướp gà trong tủ lạnh.;Nướng gà 200°C đến chín kỹ, lật một lần.;Thái bắp cải và cà rốt, trộn sữa chua với chút chanh.;Dùng gà nóng cùng salad lạnh.
`],
  ['mon-bo','Món bò','Thịt bò xào, hầm, nướng và các món quốc tế.',`
53366|Beef and Broccoli Stir-Fry|Bò xào bông cải xanh|Trung Quốc|15|12|3|E|Thịt bò mềm, bông cải xanh giòn với sốt xì dầu và dầu hào.|Thịt bò~350~g;Bông cải xanh~300~g;Tỏi~3~tép;Dầu hào~1~muỗng canh;Xì dầu~1~muỗng canh;Bột bắp~1~muỗng cà phê;Dầu ăn~2~muỗng canh|Thái bò ngang thớ, ướp xì dầu và bột bắp.;Chần bông cải nhanh, để ráo.;Xào tỏi và bò lửa lớn đến mức chín phù hợp, thêm bông cải và dầu hào.;Đảo thêm một phút rồi dọn ngay.
52904|Beef Bourguignon|Bò hầm vang Bourguignon|Pháp|25|150|4|H|Thịt bò hầm chậm với vang đỏ, cà rốt và nấm, hợp với bánh mì.|Thịt bò~800~g;Rượu vang đỏ~350~ml;Nước dùng bò~300~ml;Cà rốt~2~củ;Hành tây~1~củ;Nấm mỡ~200~g;Bột mì~2~muỗng canh;Lá nguyệt quế~2~lá;Dầu ăn~2~muỗng canh|Thấm khô thịt bò, áo nhẹ bột mì và áp chảo vàng từng mẻ.;Xào hành cà rốt, thêm vang và nước dùng, cho bò cùng lá nguyệt quế.;Hầm lửa thấp đến khi thịt mềm.;Thêm nấm đã xào, nêm và nấu sốt đến độ sánh mong muốn.
53053|Beef Rendang|Bò kho nước cốt dừa Rendang|Malaysia|25|150|4|H|Bò hầm gia vị và dừa đến khi sốt khô lại, thơm sả và riềng.|Thịt bò~700~g;Nước cốt dừa~500~ml;Sả~3~cây;Riềng~30~g;Hành tím~4~củ;Tỏi~4~tép;Ớt~3~quả;Lá chanh kaffir~4~lá|Xay sả, riềng, hành, tỏi và ớt thành hỗn hợp gia vị.;Phi gia vị với chút dầu rồi đảo thịt bò cho săn.;Thêm nước cốt dừa và lá chanh, hầm nhỏ lửa đến mềm.;Đảo thường xuyên ở cuối quá trình để sốt cô lại mà không cháy.
52834|Beef stroganoff|Bò sốt kem nấm Stroganoff|Nga|15|20|3|M|Bò thái sợi, nấm mềm và sốt kem chua béo nhẹ, ăn cùng mì hoặc khoai.|Thịt bò~400~g;Nấm mỡ~200~g;Hành tây~1~củ;Kem chua~150~g;Mù tạt~1~muỗng cà phê;Bơ lạt~20~g;Nước dùng bò~100~ml|Thái bò thành dải, áp chảo nhanh rồi để riêng.;Xào hành và nấm với bơ đến thơm.;Thêm nước dùng, mù tạt, giảm lửa rồi khuấy kem chua.;Cho bò trở lại chảo, đun đến mức chín mong muốn, tránh để sốt sôi mạnh.
52803|Beef Wellington|Bò Wellington bọc bột ngàn lớp|Anh|45|40|4|H|Lõi thăn bò bọc nấm xào và lớp vỏ pastry vàng giòn.|Thăn bò~600~g;Nấm mỡ~300~g;Bột ngàn lớp~400~g;Mù tạt~2~muỗng canh;Thịt nguội prosciutto~100~g;Trứng gà~1~quả;Dầu ăn~1~muỗng canh|Áp chảo nhanh các mặt thăn bò, phết mù tạt và để nguội.;Băm nấm, xào cho khô nước rồi trải lên thịt nguội.;Bọc bò bằng nấm và thịt nguội, sau đó bọc bột và phết trứng.;Nướng 200°C đến vỏ vàng và thịt đạt ít nhất 63°C, để nghỉ 3 phút trở lên trước khi cắt.
53069|Bistek|Bò áp chảo sốt chanh xì dầu|Philippines|25|20|3|E|Bò thái lát thấm nước chanh và xì dầu, ăn kèm hành tây mềm ngọt.|Thịt bò~400~g;Chanh~2~quả;Xì dầu~3~muỗng canh;Hành tây~2~củ;Tỏi~3~tép;Dầu ăn~2~muỗng canh|Ướp bò thái lát với xì dầu, nước chanh và tỏi.;Áp chảo hành tây cắt khoanh rồi để riêng.;Xào bò từng mẻ, thêm phần nước ướp và đun sôi kỹ.;Cho hành vào, nêm và dọn với cơm.
53421|BEEF LOK LAK (Lok Lak Sach Ko)|Bò lúc lắc Lok Lak|Campuchia|15|12|3|E|Bò cắt khối áp chảo nhanh, ăn với rau và muối tiêu chanh.|Thịt bò~450~g;Dầu hào~2~muỗng canh;Xì dầu~1~muỗng canh;Tỏi~3~tép;Xà lách~100~g;Cà chua~2~quả;Chanh~1~quả;Tiêu đen~1~muỗng cà phê|Cắt bò khối nhỏ, ướp tỏi, dầu hào và xì dầu.;Xếp xà lách, cà chua trên đĩa, pha chanh tiêu.;Áp chảo bò lửa lớn từng mẻ đến độ chín an toàn.;Bày bò lên rau, dùng cùng nước chấm.
52827|Massaman Beef curry|Cà ri bò Massaman|Thái Lan|20|90|4|M|Cà ri bò với khoai tây, lạc và nước cốt dừa, cay ấm nhẹ.|Thịt bò~600~g;Sốt cà ri Massaman~50~g;Nước cốt dừa~400~ml;Khoai tây~300~g;Hành tây~1~củ;Lạc rang~40~g;Nước mắm~1~muỗng canh|Xào sốt cà ri với ít nước cốt dừa, cho bò vào đảo săn.;Thêm nước cốt dừa và nước, hầm đến bò gần mềm.;Thêm khoai tây và hành tây, nấu chín.;Nêm nước mắm, rắc lạc rang khi dọn.
52935|Steak Diane|Bít tết sốt Diane|Pháp|10|20|2|M|Bít tết áp chảo ăn cùng sốt kem, nấm và mù tạt thơm.|Thăn bò~400~g;Nấm mỡ~120~g;Hành tím~2~củ;Kem tươi~100~ml;Mù tạt~1~muỗng cà phê;Sốt Worcestershire~1~muỗng canh;Bơ lạt~25~g|Thấm khô và áp chảo thăn bò đến độ chín an toàn, để nghỉ.;Xào hành, nấm trong chảo còn nước thịt.;Thêm mù tạt, Worcestershire và kem, đun sánh nhẹ.;Rưới sốt lên bò ngay trước khi dùng.
53211|Lemongrass beef stew with noodles|Bò hầm sả ăn cùng mì|Thái Lan|20|110|4|M|Bò hầm mềm với sả và gừng, ăn cùng mì và rau thơm.|Thịt bò~650~g;Sả~3~cây;Gừng~20~g;Hành tây~1~củ;Nước dùng bò~1~lít;Mì gạo~300~g;Nước mắm~2~muỗng canh;Rau mùi~20~g|Áp chảo thịt bò, xào sả đập dập và gừng.;Thêm nước dùng và hành, hầm đến bò mềm.;Luộc mì riêng và chia bát.;Nêm nước mắm vào nước hầm, chan lên mì và rắc rau mùi.
`],
  ['mon-heo','Món heo','Món thịt heo nướng, kho, chiên và cuốn.',`
52828|Vietnamese Grilled Pork (bun-thit-nuong)|Bún thịt nướng|Việt Nam|40|20|4|M|Bún tươi cùng thịt heo nướng thơm, rau sống, lạc rang và nước mắm chua ngọt.|Thịt heo~500~g;Bún tươi~600~g;Sả~2~cây;Tỏi~4~tép;Nước mắm~3~muỗng canh;Đường~2~muỗng canh;Dưa leo~1~quả;Rau thơm~100~g;Lạc rang~40~g;Chanh~1~quả|Thái thịt mỏng, ướp sả tỏi, đường và một phần nước mắm.;Nướng thịt đến chín, vàng cạnh, không để cháy.;Pha nước mắm còn lại với chanh, đường và nước.;Chia bún, rau, dưa leo, thịt và lạc vào tô, chan nước chấm.
53235|Vietnamese-style caramel pork|Thịt heo rim nước màu|Việt Nam|15|25|3|E|Thịt heo rim mặn ngọt, sốt màu hổ phách bám đều từng miếng.|Thịt heo~500~g;Đường nâu~40~g;Nước mắm~2~muỗng canh;Hành tím~3~củ;Gừng~10~g;Hành lá~2~nhánh;Dầu ăn~1~muỗng canh|Thái thịt miếng nhỏ, xào cho săn rồi để riêng.;Phi hành và gừng, đun đường với chút nước thành màu hổ phách.;Thêm nước mắm, nước và thịt, rim đến chín và sốt sệt.;Rắc hành lá rồi dùng với cơm nóng.
53237|Vietnamese pork salad|Gỏi thịt heo rau củ|Việt Nam|20|25|3|E|Thịt heo nạc thái mỏng trộn bắp cải, dưa leo và nước mắm chanh.|Thăn heo~400~g;Bắp cải~200~g;Dưa leo~1~quả;Sả~2~cây;Rau mùi~20~g;Nước mắm~2~muỗng canh;Chanh~2~quả;Đường~1~muỗng canh|Áp chảo rồi nướng hoặc đậy chảo cho thăn heo đạt ít nhất 63°C, để nghỉ ít nhất 3 phút.;Thái bắp cải, dưa leo và sả mỏng.;Pha chanh, nước mắm, đường và rau mùi.;Thái thịt ngang thớ, trộn cùng rau và nước trộn.
name|Sweet and Sour Pork|Heo sốt chua ngọt|Trung Quốc|20|20|3|M|Thịt heo chiên giòn trộn dứa, ớt chuông và sốt cà chua chua ngọt.|Thịt heo~400~g;Dứa~150~g;Ớt chuông đỏ~1~quả;Bột bắp~60~g;Tương cà~3~muỗng canh;Giấm gạo~2~muỗng canh;Đường~1~muỗng canh;Dầu ăn~vừa đủ|Cắt thịt khối, áo bột rồi chiên đến chín.;Xào dứa và ớt chuông cho vừa mềm.;Đun tương cà, giấm, đường và chút nước thành sốt.;Trộn thịt với rau và sốt, dùng ngay.
name|Japanese Katsudon|Cơm Katsudon thịt heo và trứng|Nhật Bản|20|25|2|M|Cơm nóng phủ thịt heo chiên xù, hành tây và trứng mềm.|Thăn heo~300~g;Trứng gà~3~quả;Bột mì~40~g;Bột chiên xù~80~g;Hành tây~1~củ;Nước dùng dashi~180~ml;Xì dầu~2~muỗng canh;Cơm trắng~2~bát;Dầu ăn~vừa đủ|Áo thịt bằng bột mì, một quả trứng đánh tan và bột chiên xù.;Chiên thịt đến vàng giòn, chín an toàn rồi cắt lát.;Đun hành trong dashi và xì dầu, cho thịt vào, rưới hai quả trứng còn lại và nấu chín.;Múc tất cả lên bát cơm.
name|Portuguese barbecued pork (Febras assadas)|Heo nướng paprika kiểu Bồ Đào Nha|Bồ Đào Nha|30|15|3|E|Lát thịt heo nướng thơm tỏi, paprika và chanh.|Thịt heo~500~g;Tỏi~4~tép;Bột paprika~2~muỗng cà phê;Chanh~1~quả;Dầu ô liu~2~muỗng canh;Muối~vừa đủ|Thái thịt thành lát, ướp tỏi, paprika, chanh và dầu.;Làm nóng vỉ hoặc chảo gang.;Nướng hai mặt đến khi thịt đạt 63°C trở lên, để nghỉ 3 phút.;Dùng cùng bánh mì hoặc salad.
name|BBQ Pork Sloppy Joes|Bánh mì kẹp heo sốt BBQ|Mỹ|15|25|4|E|Nhân thịt heo xào sốt BBQ đậm đà kẹp bánh mềm.|Thịt heo xay~450~g;Hành tây~1~củ;Tương cà~3~muỗng canh;Sốt BBQ~100~g;Bánh burger~4~cái;Dưa leo muối~80~g;Dầu ăn~1~muỗng canh|Xào hành tây rồi thêm thịt xay, đảo tơi đến chín kỹ.;Thêm tương cà và BBQ, rim cho nhân sệt.;Nướng nhẹ mặt cắt bánh.;Kẹp thịt và dưa leo muối, dùng nóng.
name|Wontons|Hoành thánh nhân thịt heo|Trung Quốc|30|15|4|M|Hoành thánh nhân thịt và gừng, dùng với nước dùng trong.|Vỏ hoành thánh~30~lá;Thịt heo xay~300~g;Gừng~10~g;Hành lá~3~nhánh;Xì dầu~1~muỗng canh;Dầu mè~1~muỗng cà phê;Nước dùng gà~1~lít|Trộn thịt xay với gừng, hành, xì dầu và dầu mè.;Đặt nhân nhỏ vào vỏ, làm ẩm mép rồi gói kín.;Luộc hoành thánh trong nước sôi đến nhân chín kỹ.;Chia ra bát, chan nước dùng nóng và hành lá.
name|Barbecue pork buns|Bánh bao xá xíu|Việt Nam|75|20|6|H|Bánh bao hấp mềm, nhân thịt heo xá xíu ngọt mặn.|Bột mì~350~g;Men khô~5~g;Đường~30~g;Nước~190~ml;Thịt heo xá xíu chín~250~g;Dầu hào~1~muỗng canh;Bột bắp~1~muỗng canh|Nhào bột với men, đường và nước, ủ đến nở.;Xắt nhỏ xá xíu, xào với dầu hào và bột bắp hòa nước cho nhân sệt, để nguội.;Chia bột, cán tròn, bọc nhân và ủ lần hai.;Hấp trên nước sôi đến vỏ chín xốp.
name|Skillet Apple Pork Chops with Roasted Sweet Potatoes & Zucchini|Sườn heo áp chảo táo và rau củ nướng|Mỹ|20|35|2|M|Sườn heo áp chảo ăn với táo ngọt, khoai lang và bí ngòi nướng.|Sườn cốt lết heo~450~g;Táo~1~quả;Khoai lang~300~g;Bí ngòi~1~quả;Bơ lạt~20~g;Dầu ô liu~2~muỗng canh;Muối~vừa đủ|Cắt khoai và bí ngòi, trộn dầu rồi nướng 200°C đến mềm vàng.;Áp chảo sườn đến ít nhất 63°C, để nghỉ 3 phút.;Xào táo thái lát với bơ trong chảo sườn.;Dọn sườn cùng táo và rau củ nướng.
`],
  ['mon-ca','Món cá','Cá nướng, hấp, kho và áp chảo.',`
52959|Baked salmon with fennel & tomatoes|Cá hồi nướng thì là củ và cà chua|Anh|10|22|2|E|Cá hồi nướng cùng thì là củ và cà chua, vị ngọt thanh.|Cá hồi~350~g;Củ thì là~1~củ;Cà chua bi~200~g;Chanh~1~quả;Dầu ô liu~2~muỗng canh;Muối~vừa đủ|Thái mỏng củ thì là, trộn với cà chua và dầu.;Nướng rau ở 200°C khoảng 10 phút.;Đặt cá hồi lên rau, thêm chanh và nướng đến cá chín 63°C.;Dọn nóng với phần nước rau nướng.
52773|Honey Teriyaki Salmon|Cá hồi sốt Teriyaki mật ong|Nhật Bản|15|15|2|E|Cá hồi áp chảo phủ sốt xì dầu mật ong bóng nhẹ.|Cá hồi~350~g;Mật ong~2~muỗng canh;Xì dầu~2~muỗng canh;Gừng~10~g;Tỏi~2~tép;Mè~1~muỗng cà phê;Dầu ăn~1~muỗng canh|Trộn mật ong, xì dầu, gừng và tỏi.;Áp chảo cá mặt da trước đến gần chín.;Thêm sốt và rim lửa nhỏ đến cá đạt 63°C, sốt sệt nhẹ.;Rắc mè và dùng cùng cơm.
53228|Vietnamese caramel trout|Cá hồi vân kho caramel|Việt Nam|15|25|3|E|Cá hồi vân rim nước mắm đường, thơm hành và gừng.|Cá hồi vân~500~g;Nước mắm~2~muỗng canh;Đường~2~muỗng canh;Gừng~15~g;Hành tím~2~củ;Tiêu đen~vừa đủ;Dầu ăn~1~muỗng canh|Làm sạch cá, thấm khô và cắt khúc.;Thắng đường với chút nước, thêm hành gừng và nước mắm.;Cho cá vào, thêm ít nước, kho nhỏ lửa đến chín.;Rắc tiêu, dùng nóng với cơm.
53247|Sea bass with sizzled ginger, chilli & spring onions|Cá chẽm gừng ớt hành lá|Việt Nam|15|20|3|M|Cá chẽm mềm, thơm gừng hành và dầu nóng.|Cá chẽm~600~g;Gừng~25~g;Hành lá~4~nhánh;Ớt~1~quả;Xì dầu~2~muỗng canh;Dầu ăn~2~muỗng canh|Làm sạch và khía cá, hấp đến thịt chín hoàn toàn.;Thái gừng, ớt và hành thành sợi mảnh.;Rưới xì dầu lên cá rồi phủ rau gia vị.;Đun nóng dầu vừa đủ, rưới cẩn thận lên hành gừng trước khi dùng.
53202|Thai-style steamed fish|Cá hấp chanh tỏi kiểu Thái|Thái Lan|15|20|3|M|Cá hấp mềm với nước chanh, ớt và tỏi đậm vị.|Cá chẽm~600~g;Sả~2~cây;Chanh~3~quả;Tỏi~5~tép;Ớt~2~quả;Nước mắm~3~muỗng canh;Đường~1~muỗng canh;Rau mùi~20~g|Làm sạch cá, nhồi sả đập dập rồi hấp chín.;Pha nước mắm, chanh, đường, tỏi và ớt băm.;Đun nước sốt đến đường tan rồi điều chỉnh vị.;Rưới sốt lên cá và thêm rau mùi.
53041|Grilled Portuguese sardines|Cá mòi nướng kiểu Bồ Đào Nha|Bồ Đào Nha|10|15|3|E|Cá mòi nướng vỏ xém nhẹ, ăn cùng chanh và bánh mì.|Cá mòi~500~g;Muối hạt~1~muỗng cà phê;Dầu ô liu~1~muỗng canh;Chanh~1~quả;Bánh mì~3~lát|Làm sạch cá, để ráo và rắc muối.;Làm nóng vỉ, quét dầu mỏng.;Nướng hai mặt đến cá chín và da xém.;Dùng với chanh và bánh mì nướng.
52944|Escovitch Fish|Cá chiên Escovitch|Jamaica|20|25|3|M|Cá chiên giòn phủ hành, cà rốt và ớt ngâm giấm chua cay.|Cá hồng~500~g;Cà rốt~1~củ;Hành tây~1~củ;Ớt~2~quả;Giấm~100~ml;Tiêu đen~vừa đủ;Dầu ăn~vừa đủ|Làm sạch cá, thấm khô và nêm nhẹ.;Chiên cá đến vàng giòn và chín.;Đun giấm với hành, cà rốt, ớt và chút muối đến rau vừa mềm.;Rưới phần rau giấm lên cá trước khi dùng.
53103|Barramundi with Moroccan spices|Cá chẽm áp chảo gia vị Morocco|Australia|15|15|2|E|Cá chẽm thơm paprika và thì là, kết hợp vị chanh dịu.|Phi lê cá chẽm~350~g;Bột paprika~1~muỗng cà phê;Bột thì là Ai Cập~1~muỗng cà phê;Bột rau mùi~1~muỗng cà phê;Dầu ô liu~2~muỗng canh;Chanh~1~quả|Trộn gia vị với dầu và phết lên cá.;Làm nóng chảo, đặt cá mặt da xuống trước.;Lật cá khi mặt dưới vàng, nấu đến tâm cá đạt 63°C.;Vắt chanh lên cá rồi dọn nóng.
52809|Recheado Masala Fish|Cá chiên sốt gia vị Recheado|Ấn Độ|25|15|3|M|Cá tẩm gia vị đỏ chua cay kiểu Goa, chiên đến thơm giòn.|Cá thu~450~g;Ớt khô~5~quả;Giấm~2~muỗng canh;Tỏi~4~tép;Gừng~15~g;Bột thì là Ai Cập~1~muỗng cà phê;Dầu ăn~2~muỗng canh|Ngâm mềm ớt, xay cùng giấm và gia vị.;Khía cá, phết hỗn hợp và ướp ngắn trong tủ lạnh.;Chiên áp chảo hai mặt với dầu đến cá chín.;Dùng với chanh hoặc cơm.
53045|Portuguese fish stew (Caldeirada de peixe)|Cá hầm khoai tây Caldeirada|Bồ Đào Nha|20|35|4|M|Cá hầm cùng khoai tây, cà chua và ớt chuông, nước dùng ngọt.|Phi lê cá trắng~600~g;Khoai tây~350~g;Cà chua~300~g;Ớt chuông đỏ~1~quả;Hành tây~1~củ;Dầu ô liu~2~muỗng canh;Nước dùng cá~400~ml|Xếp hành, khoai, cà chua và ớt chuông vào nồi với dầu.;Thêm nước dùng, đun đến khoai gần mềm.;Đặt cá lên trên, đậy nắp nấu nhẹ đến cá chín.;Nêm và múc ra đĩa sâu.
`],
  ['hai-san','Hải sản','Tôm, mực, cua và các món hải sản.',`
53144|Gambas al ajillo|Tôm sốt dầu ô liu tỏi|Tây Ban Nha|10|10|2|E|Tôm chín ngọt trong dầu ô liu thơm tỏi và ớt.|Tôm~350~g;Tỏi~5~tép;Dầu ô liu~4~muỗng canh;Ớt~1~quả;Rau mùi tây~10~g;Chanh~1~quả|Bóc vỏ tôm, bỏ chỉ đen, thấm khô.;Đun dầu với tỏi thái lát và ớt đến thơm.;Thêm tôm đảo đến thịt đục và chín.;Rắc rau mùi tây, vắt chanh và dùng với bánh mì.
52764|Garides Saganaki|Tôm sốt cà chua phô mai Feta|Hy Lạp|15|25|3|E|Tôm nấu trong sốt cà chua đậm, phủ phô mai Feta mặn nhẹ.|Tôm~400~g;Cà chua~400~g;Phô mai Feta~100~g;Hành tây~1~củ;Tỏi~3~tép;Dầu ô liu~2~muỗng canh;Rau mùi tây~10~g|Phi hành tỏi, thêm cà chua cắt nhỏ và nấu sệt.;Cho tôm đã làm sạch vào sốt.;Rắc Feta vụn và nấu đến tôm chín.;Thêm rau mùi tây, dùng nóng.
53233|Salt & pepper squid|Mực chiên muối tiêu|Việt Nam|15|15|3|M|Mực chiên giòn nhẹ, thơm tiêu, hành và ớt.|Mực~400~g;Bột bắp~80~g;Tiêu đen~1~muỗng cà phê;Muối~1~muỗng cà phê;Hành lá~2~nhánh;Ớt~1~quả;Dầu ăn~vừa đủ|Làm sạch mực, cắt khoanh và thấm khô.;Trộn bột bắp, muối và tiêu, áo mực mỏng.;Chiên từng mẻ nhanh đến vàng và mực chín.;Đảo với hành ớt thái nhỏ rồi dọn ngay.
53178|Fried calamari|Mực chiên giòn kiểu Địa Trung Hải|Tây Ban Nha|15|12|3|E|Khoanh mực phủ bột mỏng, dùng cùng chanh tươi.|Mực~400~g;Bột mì~80~g;Bột bắp~30~g;Chanh~1~quả;Muối~vừa đủ;Dầu ăn~vừa đủ|Rửa sạch mực, cắt khoanh và lau khô.;Trộn hai loại bột cùng muối, áo đều mực.;Chiên dầu nóng theo mẻ nhỏ đến giòn và chín.;Để ráo, dọn với chanh.
53180|Garlicky prawns with sherry|Tôm xào tỏi rượu sherry|Tây Ban Nha|10|10|2|E|Tôm áp chảo thơm tỏi và rượu sherry, sốt nhẹ.|Tôm~350~g;Tỏi~4~tép;Rượu sherry~50~ml;Dầu ô liu~2~muỗng canh;Rau mùi tây~10~g;Muối~vừa đủ|Bóc vỏ và làm sạch tôm.;Phi tỏi với dầu ô liu, cho tôm vào đảo.;Thêm sherry, đun sôi đến tôm chín và sốt giảm.;Nêm muối, rắc rau thơm.
52946|Kung Po Prawns|Tôm xào Kung Pao|Trung Quốc|15|12|3|M|Tôm xào sốt cay chua ngọt cùng lạc rang và ớt khô.|Tôm~350~g;Lạc rang~40~g;Ớt khô~4~quả;Tỏi~3~tép;Gừng~10~g;Xì dầu~2~muỗng canh;Giấm gạo~1~muỗng canh;Bột bắp~1~muỗng cà phê;Dầu ăn~2~muỗng canh|Làm sạch tôm và hòa xì dầu, giấm, bột bắp với chút nước.;Phi tỏi gừng ớt, cho tôm vào xào.;Đổ sốt, đảo đến tôm chín và sốt bám đều.;Rắc lạc trước khi tắt bếp.
53375|Shrimp With Snow Peas|Tôm xào đậu Hà Lan non|Trung Quốc|12|10|3|E|Tôm ngọt và đậu Hà Lan non giòn, sốt gừng tỏi nhẹ.|Tôm~350~g;Đậu Hà Lan non~200~g;Gừng~10~g;Tỏi~2~tép;Xì dầu~1~muỗng canh;Bột bắp~1~muỗng cà phê;Dầu ăn~2~muỗng canh|Bóc vỏ tôm, tước xơ đậu.;Phi gừng tỏi, xào tôm đến gần chín.;Thêm đậu và xì dầu, đảo nhanh.;Thêm bột bắp hòa chút nước, nấu đến tôm chín và sốt sánh nhẹ.
53200|Prawn stir-fry|Tôm xào rau củ kiểu Thái|Thái Lan|15|10|3|E|Tôm xào nhanh với ớt chuông và rau, thơm xì dầu và chanh.|Tôm~350~g;Ớt chuông đỏ~1~quả;Bông cải xanh~150~g;Tỏi~3~tép;Nước mắm~1~muỗng canh;Xì dầu~1~muỗng canh;Chanh~1~quả;Dầu ăn~2~muỗng canh|Làm sạch tôm, cắt rau thành miếng nhỏ.;Phi tỏi rồi xào rau trên lửa lớn.;Cho tôm và gia vị vào, đảo đến tôm chín.;Vắt chanh nhẹ trước khi dọn.
53205|Thai prawn curry|Cà ri tôm nước cốt dừa|Thái Lan|15|20|3|E|Cà ri tôm béo thơm dừa, cay vừa, ăn với cơm trắng.|Tôm~400~g;Nước cốt dừa~400~ml;Sốt cà ri đỏ~40~g;Ớt chuông đỏ~1~quả;Nước mắm~1~muỗng canh;Lá chanh kaffir~3~lá;Chanh~1~quả|Xào sốt cà ri với một ít nước cốt dừa.;Thêm dừa còn lại và ớt chuông, đun nhẹ.;Cho tôm vào cuối, nấu đến chín.;Nêm nước mắm, chanh và lá chanh thái sợi.
53174|Prawns with Romesco sauce|Tôm nướng sốt Romesco|Tây Ban Nha|15|25|3|M|Tôm nướng ăn cùng sốt ớt đỏ, cà chua và hạnh nhân.|Tôm~400~g;Ớt chuông đỏ~2~quả;Cà chua~2~quả;Hạnh nhân~40~g;Tỏi~2~tép;Dầu ô liu~3~muỗng canh;Giấm~1~muỗng canh|Nướng ớt chuông, cà chua và tỏi đến mềm.;Xay rau nướng với hạnh nhân, dầu và giấm thành sốt.;Nướng hoặc áp chảo tôm đã làm sạch đến chín.;Bày tôm với sốt Romesco.
`],
  ['mon-chay','Món chay','Các món không thịt từ đậu, rau và ngũ cốc.',`
53240|Tofu, greens & cashew stir-fry|Đậu hũ xào rau xanh và hạt điều|Việt Nam|15|15|3|E|Đậu hũ vàng, rau xanh giòn và hạt điều bùi, ăn với cơm.|Đậu hũ~400~g;Cải thìa~250~g;Hạt điều~50~g;Tỏi~3~tép;Xì dầu~2~muỗng canh;Dầu ăn~2~muỗng canh|Thấm khô đậu hũ, cắt khối và áp chảo vàng.;Phi tỏi, xào cải thìa trên lửa lớn.;Thêm đậu và xì dầu, đảo nhẹ.;Rắc hạt điều rang trước khi dùng.
52908|Ratatouille|Rau củ hầm Ratatouille|Pháp|20|40|4|E|Cà tím, bí ngòi và cà chua hầm thơm thảo mộc.|Cà tím~250~g;Bí ngòi~250~g;Cà chua~400~g;Ớt chuông đỏ~1~quả;Hành tây~1~củ;Tỏi~3~tép;Dầu ô liu~3~muỗng canh;Cỏ xạ hương~1~muỗng cà phê|Cắt rau củ thành khối đều.;Áp chảo riêng cà tím và bí ngòi cho vàng nhẹ.;Xào hành, tỏi và ớt chuông, thêm cà chua và thảo mộc.;Cho rau vào hầm lửa nhỏ đến mềm nhưng còn hình dáng.
53369|Silken Tofu with Sesame Soy Sauce|Đậu hũ non sốt mè xì dầu|Trung Quốc|8|5|2|E|Đậu hũ non mịn mát với sốt xì dầu và mè thơm.|Đậu hũ non~300~g;Xì dầu~2~muỗng canh;Dầu mè~1~muỗng cà phê;Mè~1~muỗng cà phê;Hành lá~2~nhánh;Gừng~5~g|Để ráo đậu hũ non và đặt lên đĩa.;Trộn xì dầu, dầu mè và gừng băm.;Hấp đậu nhẹ vài phút nếu thích dùng ấm.;Rưới sốt, rắc mè và hành lá.
53374|Sichuan Eggplant|Cà tím sốt cay Tứ Xuyên|Trung Quốc|15|20|3|M|Cà tím mềm thấm sốt đậu cay, tỏi gừng và giấm.|Cà tím~400~g;Tương đậu cay~1~muỗng canh;Tỏi~3~tép;Gừng~10~g;Xì dầu~1~muỗng canh;Giấm gạo~1~muỗng canh;Đường~1~muỗng cà phê;Dầu ăn~2~muỗng canh|Cắt cà tím thành thanh, áp chảo đến mềm.;Phi tỏi gừng và tương đậu cay.;Cho cà tím vào với xì dầu, giấm, đường và chút nước.;Rim đến sốt bám đều rồi dọn nóng.
52785|Dal fry|Đậu lăng hầm gia vị Dal Fry|Ấn Độ|10|35|4|E|Đậu lăng vàng hầm sánh, thơm thì là và hành phi.|Đậu lăng vàng~200~g;Cà chua~2~quả;Hành tây~1~củ;Tỏi~3~tép;Bột nghệ~1~muỗng cà phê;Hạt thì là Ai Cập~1~muỗng cà phê;Dầu ăn~2~muỗng canh|Rửa đậu lăng rồi nấu với nước và nghệ đến mềm.;Phi hạt thì là, hành và tỏi.;Thêm cà chua, nấu mềm rồi trộn vào đậu.;Đun thêm vài phút, nêm muối vừa ăn.
52865|Matar Paneer|Cà ri đậu Hà Lan và Paneer|Ấn Độ|15|25|3|M|Phô mai Paneer và đậu Hà Lan trong sốt cà chua gia vị ấm.|Phô mai Paneer~250~g;Đậu Hà Lan~150~g;Cà chua~300~g;Hành tây~1~củ;Garam masala~2~muỗng cà phê;Gừng~10~g;Tỏi~3~tép;Dầu ăn~2~muỗng canh|Xào hành, gừng, tỏi, thêm cà chua và gia vị.;Nấu mềm rồi xay sốt nếu muốn mịn.;Cho đậu Hà Lan và Paneer cắt khối vào sốt.;Đun nhỏ lửa đến đậu chín và nêm.
53266|Falafel|Viên đậu gà Falafel|Thổ Nhĩ Kỳ|45|20|4|M|Viên đậu gà chiên giòn, bên trong thơm rau mùi và gia vị.|Đậu gà khô~250~g;Hành tây~1~củ;Tỏi~3~tép;Rau mùi~30~g;Bột thì là Ai Cập~2~muỗng cà phê;Bột mì~2~muỗng canh;Dầu ăn~vừa đủ|Ngâm đậu gà qua đêm, để ráo trước khi chế biến.;Xay thô đậu với hành, tỏi, rau mùi và gia vị.;Trộn bột, nặn viên nhỏ, làm lạnh cho chắc.;Chiên từng mẻ đến vàng và chín kỹ bên trong.
53067|Stuffed Bell Peppers with Quinoa and Black Beans|Ớt chuông nhồi quinoa và đậu đen|Mexico|20|40|4|M|Ớt chuông nướng nhồi quinoa, đậu đen và cà chua.|Ớt chuông đỏ~4~quả;Quinoa~150~g;Đậu đen đã nấu chín~200~g;Cà chua~200~g;Hành tây~1~củ;Bột thì là Ai Cập~1~muỗng cà phê;Dầu ô liu~2~muỗng canh|Nấu quinoa đến chín, xào hành cà chua với gia vị.;Trộn quinoa với đậu đen và sốt rau.;Bỏ lõi ớt chuông, nhồi nhân và đặt khay.;Nướng 190°C đến ớt mềm và nhân nóng đều.
53074|Grilled eggplant with coconut milk|Cà tím nướng nước cốt dừa|Philippines|10|25|3|E|Cà tím nướng thơm khói, phủ sốt dừa béo nhẹ.|Cà tím~450~g;Nước cốt dừa~200~ml;Tỏi~3~tép;Hành tím~2~củ;Ớt~1~quả;Muối~vừa đủ;Dầu ăn~1~muỗng canh|Nướng cà tím đến mềm, bóc lớp vỏ cháy.;Phi hành tỏi, thêm nước cốt dừa và ớt.;Đun sốt lửa nhỏ đến sánh nhẹ, nêm muối.;Rưới sốt lên cà tím và dùng ấm.
52868|Kidney Bean Curry|Cà ri đậu đỏ Rajma|Ấn Độ|15|35|4|E|Đậu đỏ nấu mềm trong sốt cà chua và garam masala.|Đậu đỏ đã nấu chín~400~g;Cà chua~300~g;Hành tây~1~củ;Gừng~15~g;Tỏi~3~tép;Garam masala~2~muỗng cà phê;Dầu ăn~2~muỗng canh|Phi hành, gừng tỏi rồi thêm cà chua và gia vị.;Nấu sốt đến mềm và dậy mùi.;Thêm đậu đã nấu chín và chút nước, đun sôi rồi hầm nhỏ lửa.;Nêm và ăn cùng cơm nóng.
`],
  ['mi-bun','Mì, bún và pasta','Các món mì xào, mì Ý, bún và pasta đút lò.',`
52982|Spaghetti alla Carbonara|Mì Ý Carbonara|Ý|10|15|2|M|Spaghetti trộn trứng, phô mai và thịt muối, sốt sánh không cần kem.|Spaghetti~200~g;Thịt guanciale~100~g;Trứng gà~2~quả;Phô mai Pecorino~60~g;Tiêu đen~1~muỗng cà phê|Luộc mì theo hướng dẫn, giữ lại một ít nước luộc.;Áp chảo guanciale đến vàng và ra mỡ.;Đánh trứng với phô mai và tiêu, trộn mì nóng ngoài lửa, thêm nước luộc từ từ.;Dùng trứng tiệt trùng hoặc làm nóng nhẹ hỗn hợp đến an toàn mà không để vón cục.
52770|Spaghetti Bolognese|Spaghetti sốt bò bằm|Ý|15|50|4|E|Mì Ý với sốt cà chua và bò xay hầm thơm rau củ.|Spaghetti~350~g;Thịt bò xay~400~g;Cà chua nghiền~500~g;Hành tây~1~củ;Cà rốt~1~củ;Tỏi~3~tép;Dầu ô liu~2~muỗng canh;Phô mai Parmesan~40~g|Xào hành, cà rốt và tỏi, cho bò vào đảo tơi đến chín.;Thêm cà chua nghiền và hầm nhỏ lửa đến sốt sệt.;Luộc spaghetti, để ráo.;Trộn mì với sốt, rắc Parmesan.
53064|Fettuccine Alfredo|Fettuccine sốt bơ phô mai Alfredo|Ý|10|15|2|E|Mì dẹt phủ sốt bơ và Parmesan mượt mà.|Fettuccine~200~g;Bơ lạt~60~g;Phô mai Parmesan~80~g;Tiêu đen~vừa đủ;Muối~vừa đủ|Luộc mì đến vừa chín, giữ nước luộc.;Làm tan bơ ở lửa nhỏ.;Đảo mì nóng cùng bơ, Parmesan và từng chút nước luộc đến sốt bóng.;Rắc tiêu và dùng ngay.
52839|Chilli prawn linguine|Linguine tôm tỏi ớt|Ý|15|15|2|E|Mì linguine với tôm, tỏi, ớt và hương chanh tươi.|Linguine~200~g;Tôm~250~g;Tỏi~4~tép;Ớt~1~quả;Cà chua bi~150~g;Dầu ô liu~3~muỗng canh;Chanh~1~quả|Luộc linguine và giữ lại ít nước luộc.;Phi tỏi ớt với dầu, xào cà chua bi.;Thêm tôm đã làm sạch, nấu đến chín.;Đảo mì với nước luộc, sốt tôm và chanh.
52844|Lasagne|Lasagna bò bằm đút lò|Ý|25|60|6|H|Các lớp lá lasagna xen sốt bò cà chua, béchamel và phô mai.|Lá lasagna~250~g;Thịt bò xay~500~g;Cà chua nghiền~500~g;Hành tây~1~củ;Bơ lạt~40~g;Bột mì~40~g;Sữa tươi~500~ml;Phô mai mozzarella~150~g|Xào hành và bò, thêm cà chua, nấu thành sốt thịt.;Khuấy bơ và bột mì trên lửa nhỏ, thêm sữa dần cho béchamel sánh.;Xếp lá mì, sốt thịt, béchamel thành nhiều lớp, phủ mozzarella.;Nướng 190°C đến mì mềm, mặt vàng, để nghỉ trước khi cắt.
52774|Pad See Ew|Mì gạo xào xì dầu Pad See Ew|Thái Lan|15|12|3|M|Sợi mì gạo bản rộng xào với gà, trứng và cải xanh.|Mì gạo bản rộng~400~g;Thịt đùi gà~250~g;Cải làn~200~g;Trứng gà~2~quả;Xì dầu~2~muỗng canh;Hắc xì dầu~1~muỗng canh;Tỏi~3~tép;Dầu ăn~2~muỗng canh|Chuẩn bị mì theo hướng dẫn, thái gà và cải.;Xào tỏi và gà đến chín, thêm trứng và đảo tơi.;Cho cải, mì và hai loại xì dầu vào chảo nóng.;Đảo nhanh đến mì thơm cạnh, nêm vừa ăn.
53191|Pad Thai|Pad Thai tôm đậu hũ|Thái Lan|20|15|3|M|Mì gạo xào sốt me, tôm, đậu hũ, giá và lạc.|Mì gạo~250~g;Tôm~250~g;Đậu hũ~150~g;Trứng gà~2~quả;Giá đỗ~150~g;Nước cốt me~3~muỗng canh;Nước mắm~2~muỗng canh;Đường thốt nốt~2~muỗng canh;Lạc rang~40~g;Dầu ăn~2~muỗng canh|Ngâm mì đến mềm, pha sốt me với nước mắm và đường.;Chiên đậu hũ, xào tôm đến chín và thêm trứng.;Cho mì và sốt vào đảo đến sợi mềm, thêm giá.;Rắc lạc rang và dùng nóng.
52871|Yaki Udon|Mì Udon xào rau củ|Nhật Bản|12|15|2|E|Mì udon mềm dai xào nấm, bắp cải và sốt xì dầu.|Udon~400~g;Bắp cải~150~g;Cà rốt~1~củ;Nấm mỡ~100~g;Xì dầu~2~muỗng canh;Dầu mè~1~muỗng cà phê;Dầu ăn~1~muỗng canh|Luộc hoặc trụng mì udon theo hướng dẫn.;Thái rau và nấm, xào lửa lớn đến vừa mềm.;Thêm udon và xì dầu, đảo đến nóng đều.;Rưới dầu mè và dọn ra đĩa.
52952|Beef Lo Mein|Mì trứng xào bò Lo Mein|Trung Quốc|15|15|3|E|Mì trứng xào bò, bắp cải và cà rốt trong sốt xì dầu.|Mì trứng~300~g;Thịt bò~300~g;Bắp cải~150~g;Cà rốt~1~củ;Tỏi~3~tép;Xì dầu~2~muỗng canh;Dầu hào~1~muỗng canh;Dầu ăn~2~muỗng canh|Luộc mì và để ráo, thái bò ngang thớ.;Xào bò lửa lớn đến độ chín an toàn rồi lấy ra.;Xào tỏi, bắp cải, cà rốt, thêm mì và gia vị.;Cho bò trở lại, đảo đều và dùng ngay.
52771|Spicy Arrabiata Penne|Penne sốt cà chua cay Arrabbiata|Ý|10|25|3|E|Mì ống penne với sốt cà chua, tỏi và ớt, vị cay rõ.|Penne~300~g;Cà chua nghiền~400~g;Tỏi~4~tép;Ớt khô~2~quả;Dầu ô liu~2~muỗng canh;Rau mùi tây~10~g;Muối~vừa đủ|Phi tỏi và ớt trong dầu ô liu.;Thêm cà chua nghiền, nấu lửa nhỏ cho sốt sệt.;Luộc penne đến vừa chín, trộn với sốt và chút nước luộc.;Rắc rau mùi tây trước khi ăn.
`],
  ['mon-com','Cơm và ngũ cốc','Cơm chiên, cơm nấu cùng thịt, đậu và hải sản.',`
53367|Chicken Fried Rice|Cơm chiên gà|Trung Quốc|15|12|3|E|Cơm chiên tơi hạt với gà, trứng và rau củ.|Cơm trắng~450~g;Ức gà~250~g;Trứng gà~2~quả;Cà rốt~1~củ;Đậu Hà Lan~80~g;Xì dầu~2~muỗng canh;Hành lá~2~nhánh;Dầu ăn~2~muỗng canh|Cắt gà và rau củ, dùng cơm nguội đã bảo quản lạnh an toàn.;Xào gà đến chín kỹ, thêm rau và trứng đảo tơi.;Cho cơm và xì dầu vào, đảo lửa lớn đến nóng đều.;Rắc hành lá, ăn ngay, không giữ ở nhiệt độ phòng lâu.
53151|Paella|Cơm Paella hải sản|Tây Ban Nha|20|40|4|M|Cơm hạt ngắn nấu nghệ tây với tôm, mực và rau củ.|Gạo hạt ngắn~300~g;Tôm~300~g;Mực~200~g;Cà chua~2~quả;Ớt chuông đỏ~1~quả;Nước dùng cá~800~ml;Nghệ tây~1~nhúm;Dầu ô liu~2~muỗng canh|Xào cà chua và ớt chuông, thêm gạo và nghệ tây.;Đổ nước dùng nóng, nấu lửa vừa mà không đảo nhiều.;Khi gạo gần mềm, xếp tôm mực lên trên, nấu đến hải sản chín.;Để cơm nghỉ vài phút trước khi dùng.
52823|Salmon Prawn Risotto|Risotto cá hồi và tôm|Ý|15|30|3|M|Cơm risotto dẻo kem với cá hồi và tôm ngọt.|Gạo Arborio~240~g;Cá hồi~200~g;Tôm~200~g;Hành tây~1~củ;Nước dùng cá~800~ml;Bơ lạt~30~g;Chanh~1~quả|Xào hành với bơ, thêm gạo và đảo đến hạt bóng.;Múc từng vá nước dùng nóng vào, đảo đến gạo vừa mềm.;Áp chảo cá hồi và tôm đến chín, xé cá thành miếng.;Trộn hải sản với risotto, thêm chút chanh.
53198|Thai fried rice with prawns & peas|Cơm chiên tôm đậu Hà Lan|Thái Lan|12|12|3|E|Cơm chiên vị nước mắm, tôm và đậu Hà Lan ngọt.|Cơm trắng~450~g;Tôm~300~g;Đậu Hà Lan~120~g;Trứng gà~2~quả;Tỏi~3~tép;Nước mắm~2~muỗng canh;Chanh~1~quả;Dầu ăn~2~muỗng canh|Bóc vỏ tôm, chuẩn bị cơm nguội bảo quản lạnh.;Phi tỏi, xào tôm đến chín, thêm trứng.;Thêm cơm và đậu, nêm nước mắm, đảo lửa lớn đến nóng đều.;Dọn ngay với chanh.
53541|Gallo pinto|Cơm đậu đen Gallo Pinto|Costa Rica|10|15|3|E|Cơm trộn đậu đen, hành và ớt chuông, thơm rau mùi.|Cơm trắng~350~g;Đậu đen đã nấu chín~250~g;Hành tây~1~củ;Ớt chuông đỏ~1~quả;Rau mùi~20~g;Dầu ăn~2~muỗng canh;Muối~vừa đủ|Xào hành tây và ớt chuông thái hạt lựu.;Thêm đậu đen cùng chút nước nấu đậu.;Cho cơm vào đảo đến nóng đều và ráo.;Nêm muối, trộn rau mùi rồi dùng.
53357|Jamaican Rice and Peas|Cơm đậu đỏ nước cốt dừa|Jamaica|10|30|4|E|Cơm nấu đậu đỏ, dừa và cỏ xạ hương thơm dịu.|Gạo~300~g;Đậu đỏ đã nấu chín~200~g;Nước cốt dừa~250~ml;Hành lá~3~nhánh;Cỏ xạ hương~1~muỗng cà phê;Tỏi~2~tép;Muối~vừa đủ|Vo gạo, cho vào nồi với đậu và nước cốt dừa.;Thêm hành, tỏi, xạ hương, nước vừa đủ.;Nấu đậy nắp lửa nhỏ đến gạo mềm và hút nước.;Để nghỉ, xới tơi và dùng nóng.
53161|Chicken & chorizo rice pot|Cơm gà xúc xích Chorizo|Tây Ban Nha|15|35|4|M|Cơm nấu một nồi với gà, chorizo và cà chua.|Gạo~300~g;Thịt đùi gà~400~g;Xúc xích Chorizo~120~g;Cà chua~300~g;Hành tây~1~củ;Nước dùng gà~650~ml;Bột paprika~1~muỗng cà phê|Áp chảo gà và chorizo, lấy gà ra.;Xào hành, cà chua và paprika, trộn gạo.;Thêm nước dùng và gà, đậy nắp nấu đến gạo mềm và gà đạt 74°C.;Để nghỉ rồi xới nhẹ.
53147|Arroz con gambas y calamar|Cơm tôm mực Tây Ban Nha|Tây Ban Nha|20|35|4|M|Cơm nấu với mực và tôm, cà chua tạo nền vị ngọt.|Gạo hạt ngắn~300~g;Tôm~250~g;Mực~250~g;Cà chua~200~g;Tỏi~3~tép;Nước dùng cá~750~ml;Dầu ô liu~2~muỗng canh;Bột paprika~1~muỗng cà phê|Làm sạch hải sản, xào tỏi và mực.;Thêm cà chua, paprika và gạo, đảo đều.;Đổ nước dùng nóng, nấu đến gạo gần mềm.;Thêm tôm, nấu đến chín và cơm vừa ráo.
53027|Koshari|Cơm Koshari đậu lăng và mì|Ai Cập|20|40|4|M|Món cơm đậu lăng trộn mì, đậu gà, sốt cà chua và hành chiên.|Gạo~200~g;Đậu lăng~150~g;Mì ống~120~g;Đậu gà đã nấu chín~150~g;Cà chua nghiền~300~g;Hành tây~2~củ;Giấm~1~muỗng canh;Dầu ăn~3~muỗng canh|Nấu gạo, đậu lăng và mì riêng đến vừa chín.;Chiên hành thái mỏng đến vàng, để ráo.;Nấu cà chua với chút hành, giấm và muối thành sốt.;Xếp cơm, đậu, mì, đậu gà, rưới sốt và hành chiên.
53358|Chicken Mandi|Cơm gà Mandi gia vị|Ấn Độ|25|50|4|M|Gạo basmati thơm gia vị ăn cùng gà nướng vàng.|Gạo basmati~300~g;Đùi gà~650~g;Bột nghệ~1~muỗng cà phê;Bột thì là Ai Cập~1~muỗng cà phê;Bạch đậu khấu~3~quả;Hành tây~1~củ;Nước dùng gà~650~ml;Dầu ăn~2~muỗng canh|Ướp gà với nghệ, thì là và dầu, nướng đến chín kỹ.;Phi hành và bạch đậu khấu, thêm gạo đã vo.;Nấu gạo với nước dùng đến tơi mềm.;Bày gà lên cơm, dùng cùng rau tươi.
`],
  ['canh-sup','Canh, súp và món nước','Món nước dùng, cháo và súp rau củ.',`
53238|Beef pho|Phở bò|Việt Nam|30|180|4|H|Phở bò nước dùng trong, thơm quế hồi và gừng nướng.|Xương bò~1~kg;Thịt bò~400~g;Bánh phở~600~g;Hành tây~2~củ;Gừng~50~g;Hoa hồi~3~cái;Quế~1~thanh;Nước mắm~3~muỗng canh;Hành lá~3~nhánh;Rau thơm~100~g|Chần xương, rửa sạch rồi hầm trong nước mới, hớt bọt.;Nướng hành gừng, rang quế hồi rồi thêm vào nồi nước dùng.;Nấu phần thịt bò đến độ chín an toàn, thái lát, nêm nước dùng với nước mắm.;Trụng bánh phở, xếp thịt và rau, chan nước dùng thật nóng.
52956|Chicken Congee|Cháo gà gừng|Trung Quốc|15|60|4|E|Cháo gạo nấu nhừ với thịt gà xé và gừng.|Gạo~180~g;Thịt đùi gà~450~g;Gừng~25~g;Nước dùng gà~1.5~lít;Hành lá~3~nhánh;Muối~vừa đủ;Tiêu đen~vừa đủ|Vo gạo, đun với nước dùng và gừng.;Thêm gà, nấu đến thịt chín kỹ, vớt ra xé.;Ninh cháo đến hạt gạo nở nhừ, khuấy đáy nồi.;Thêm gà, nêm và rắc hành tiêu.
53207|Tom kha gai|Canh gà nước cốt dừa Tom Kha|Thái Lan|15|25|3|E|Canh gà chua dịu béo dừa với riềng, sả và nấm.|Thịt đùi gà~350~g;Nước cốt dừa~400~ml;Nước dùng gà~400~ml;Riềng~30~g;Sả~2~cây;Nấm mỡ~150~g;Nước mắm~2~muỗng canh;Chanh~2~quả|Đun nước dùng với riềng và sả đập dập.;Thêm nước cốt dừa, gà thái miếng và nấm.;Nấu lửa nhỏ đến gà chín kỹ.;Tắt bếp, nêm nước mắm và chanh.
53196|Tom yum (hot & sour) soup with prawns|Canh Tom Yum tôm chua cay|Thái Lan|15|20|3|M|Canh tôm vị chua cay, hương sả, riềng và lá chanh.|Tôm~400~g;Nước dùng cá~1~lít;Sả~3~cây;Riềng~30~g;Lá chanh kaffir~5~lá;Nấm mỡ~150~g;Ớt~2~quả;Nước mắm~2~muỗng canh;Chanh~2~quả|Đun nước dùng với sả, riềng và lá chanh.;Thêm nấm, ớt và tôm đã làm sạch.;Nấu đến tôm chín, nêm nước mắm.;Tắt bếp, vắt chanh và điều chỉnh vị.
53236|Vietnamese-style veggie hotpot|Lẩu rau củ kiểu Việt|Việt Nam|25|30|4|E|Nồi lẩu rau, đậu hũ, nấm và nước dùng ngọt thanh.|Nước dùng rau củ~1.5~lít;Đậu hũ~400~g;Nấm hương~150~g;Cải thìa~250~g;Cà rốt~1~củ;Sả~2~cây;Cà chua~2~quả;Bún tươi~400~g|Đun nước dùng với sả, cà chua và cà rốt.;Rửa sạch rau, cắt đậu và nấm vừa ăn.;Cho nấm và đậu hũ vào nồi, nêm vừa ăn.;Nhúng rau đến chín và ăn cùng bún.
53047|Moroccan Carrot Soup|Súp cà rốt gia vị Morocco|Morocco|15|30|4|E|Súp cà rốt xay mịn, thơm gừng và thì là.|Cà rốt~600~g;Hành tây~1~củ;Gừng~15~g;Bột thì là Ai Cập~1~muỗng cà phê;Nước dùng rau củ~800~ml;Dầu ô liu~2~muỗng canh|Xào hành, gừng và gia vị trong dầu.;Thêm cà rốt thái lát và nước dùng.;Nấu đến cà rốt mềm, để nguội bớt rồi xay mịn cẩn thận.;Đun lại, nêm và dùng nóng.
52955|Egg Drop Soup|Súp trứng vân mây|Trung Quốc|8|10|3|E|Súp trong với vân trứng mềm, thơm hành và dầu mè.|Trứng gà~3~quả;Nước dùng gà~800~ml;Bột bắp~1~muỗng canh;Hành lá~2~nhánh;Dầu mè~1~muỗng cà phê;Muối~vừa đủ|Đun sôi nước dùng, hòa bột bắp với nước nguội rồi khuấy vào.;Đánh tan trứng, rót thành dòng mảnh trong khi khuấy nhẹ.;Nấu đến trứng chín hoàn toàn, nêm muối.;Rắc hành lá và dầu mè.
53078|Beetroot Soup (Borscht)|Súp củ dền Borscht|Ukraine|20|45|4|M|Súp củ dền màu đỏ, khoai tây và bắp cải, vị chua nhẹ.|Củ dền~400~g;Khoai tây~250~g;Bắp cải~200~g;Cà rốt~1~củ;Hành tây~1~củ;Nước dùng rau củ~1.2~lít;Giấm~1~muỗng canh;Kem chua~80~g|Thái củ dền và cà rốt thành sợi, xào với hành.;Thêm nước dùng, khoai tây và bắp cải.;Nấu đến rau mềm, thêm giấm để cân vị.;Múc súp, thêm kem chua khi dùng.
53122|Fiskesuppe (Creamy Norwegian Fish Soup)|Súp cá kem kiểu Na Uy|Na Uy|15|30|4|M|Súp cá trắng và cá hồi với rau củ, nước dùng kem mềm dịu.|Phi lê cá trắng~300~g;Cá hồi~200~g;Cà rốt~1~củ;Khoai tây~200~g;Tỏi tây~1~cây;Nước dùng cá~800~ml;Kem tươi~150~ml;Bơ lạt~20~g|Xào tỏi tây và cà rốt với bơ.;Thêm khoai tây và nước dùng, nấu mềm.;Cho kem và cá cắt khối vào, đun nhẹ đến cá chín.;Nêm vừa ăn và dọn nóng.
53079|Fish Soup (Ukha)|Canh cá Ukha|Nga|15|35|4|E|Canh cá trong với khoai tây, hành và rau thì là.|Phi lê cá trắng~500~g;Khoai tây~300~g;Cà rốt~1~củ;Hành tây~1~củ;Nước dùng cá~1.2~lít;Lá nguyệt quế~1~lá;Rau thì là~15~g|Đun nước dùng với hành và lá nguyệt quế.;Thêm khoai và cà rốt, nấu đến gần mềm.;Cho cá vào nấu nhẹ đến chín hoàn toàn.;Nêm muối và rắc thì là.
`],
  ['salad-khai-vi','Salad và khai vị','Món trộn tươi, khai vị rau củ và hải sản.',`
53232|Vietnamese chicken salad|Gỏi gà bắp cải|Việt Nam|25|20|4|E|Gà xé trộn bắp cải, rau thơm và nước mắm chanh.|Thịt đùi gà~500~g;Bắp cải~300~g;Cà rốt~1~củ;Rau răm~30~g;Nước mắm~3~muỗng canh;Chanh~2~quả;Đường~1~muỗng canh;Lạc rang~40~g|Luộc gà đến chín kỹ, để nguội bớt rồi xé.;Thái bắp cải và cà rốt mỏng, rửa và để ráo rau răm.;Pha nước mắm, chanh và đường, trộn cùng gà và rau.;Rắc lạc rang, dùng ngay.
52960|Salmon Avocado Salad|Salad cá hồi và bơ|Anh|15|12|2|E|Cá hồi áp chảo với bơ, rau xanh và sốt chanh.|Cá hồi~300~g;Bơ~1~quả;Xà lách~120~g;Dưa leo~1~quả;Chanh~1~quả;Dầu ô liu~2~muỗng canh;Muối~vừa đủ|Áp chảo cá hồi đến chín 63°C, để nghỉ.;Rửa rau, cắt bơ và dưa leo.;Pha dầu ô liu với nước chanh và muối.;Xếp rau, bơ và cá, rưới sốt trước khi ăn.
53011|Chicken Quinoa Greek Salad|Salad quinoa gà kiểu Hy Lạp|Hy Lạp|15|20|3|E|Quinoa, gà áp chảo, cà chua, dưa leo và Feta.|Quinoa~160~g;Ức gà~300~g;Dưa leo~1~quả;Cà chua bi~150~g;Phô mai Feta~80~g;Chanh~1~quả;Dầu ô liu~2~muỗng canh|Nấu quinoa theo hướng dẫn, để nguội bớt.;Áp chảo gà đến chín kỹ rồi cắt lát.;Thái rau, trộn quinoa với chanh và dầu.;Xếp gà và Feta lên trên.
52852|Tuna Nicoise|Salad cá ngừ Niçoise|Pháp|20|20|3|M|Salad cá ngừ, trứng luộc, khoai tây và đậu que.|Cá ngừ đóng hộp~200~g;Trứng gà~3~quả;Khoai tây~250~g;Đậu que~150~g;Cà chua~2~quả;Ô liu~50~g;Dầu ô liu~3~muỗng canh;Giấm~1~muỗng canh|Luộc khoai và trứng chín, chần đậu que.;Cắt khoai, trứng và cà chua.;Để ráo cá ngừ, xếp các thành phần trên đĩa.;Rưới sốt dầu ô liu, giấm và nêm nhẹ.
53244|Prawn & noodle salad with crispy shallots|Gỏi bún tôm hành phi|Việt Nam|20|12|3|E|Bún trộn tôm, dưa leo, rau thơm và hành phi giòn.|Tôm~350~g;Bún tươi~450~g;Dưa leo~1~quả;Rau thơm~80~g;Hành tím~4~củ;Nước mắm~2~muỗng canh;Chanh~2~quả;Đường~1~muỗng canh|Luộc tôm đến chín, bóc vỏ, trụng bún nếu cần.;Phi hành tím thái mỏng đến vàng và để ráo.;Trộn bún với dưa leo, rau và tôm.;Chan nước mắm pha chanh đường, rắc hành phi.
53491|Shopska Salad|Salad Shopska cà chua và phô mai|Bulgaria|15|0|3|E|Salad cà chua, dưa leo, ớt chuông phủ phô mai trắng.|Cà chua~3~quả;Dưa leo~2~quả;Ớt chuông đỏ~1~quả;Hành tây~0.5~củ;Phô mai Feta~100~g;Dầu ô liu~2~muỗng canh;Giấm~1~muỗng canh|Rửa rau, thái cà chua, dưa leo và ớt thành khối.;Thái mỏng hành và trộn cùng rau.;Nêm dầu, giấm và chút muối.;Bào hoặc bóp vụn Feta lên trên.
53246|Tangy carrot, cabbage & onion salad|Gỏi cà rốt bắp cải hành tây|Việt Nam|15|0|3|E|Gỏi rau củ giòn, vị chua ngọt thanh mát.|Bắp cải~250~g;Cà rốt~2~củ;Hành tây~0.5~củ;Giấm gạo~2~muỗng canh;Đường~1~muỗng canh;Rau mùi~15~g;Muối~vừa đủ|Thái bắp cải, bào cà rốt và thái hành mỏng.;Ngâm hành trong nước lạnh vài phút rồi để ráo.;Hòa giấm, đường và muối, trộn với rau.;Thêm rau mùi, để ngấm ngắn trước khi ăn.
53267|Aubergine couscous salad|Salad couscous cà tím nướng|Thổ Nhĩ Kỳ|15|25|3|E|Couscous hạt tơi trộn cà tím nướng, rau thơm và chanh.|Couscous~180~g;Cà tím~350~g;Cà chua bi~150~g;Chanh~1~quả;Dầu ô liu~3~muỗng canh;Rau mùi tây~15~g;Bạc hà~10~g|Cắt cà tím, trộn dầu và nướng 200°C đến mềm.;Ngâm couscous trong nước nóng theo hướng dẫn rồi xới tơi.;Trộn couscous với cà tím, cà chua và rau thơm.;Nêm chanh và dầu ô liu.
53573|Papaya salad|Salad đu đủ xanh|Dominica|20|0|3|E|Đu đủ xanh bào sợi trộn rau và sốt chanh tươi.|Đu đủ xanh~400~g;Cà rốt~1~củ;Chanh~2~quả;Ớt~1~quả;Đường~1~muỗng canh;Muối~vừa đủ;Rau mùi~15~g|Gọt đu đủ, bỏ hạt, rửa sạch rồi bào sợi.;Bào cà rốt và thái ớt mỏng.;Pha nước chanh, đường, muối và ớt.;Trộn rau với sốt, thêm rau mùi và dùng mát.
53309|Cucumber & fennel salad|Salad dưa leo và thì là củ|Ba Lan|15|0|3|E|Dưa leo giòn và thì là củ thái mỏng, sốt chanh nhẹ.|Dưa leo~2~quả;Củ thì là~1~củ;Chanh~1~quả;Dầu ô liu~2~muỗng canh;Rau thì là~10~g;Muối~vừa đủ|Rửa dưa leo và củ thì là, thái lát mỏng.;Hòa chanh, dầu ô liu và muối.;Trộn rau với sốt ngay trước khi dùng.;Rắc thì là thái nhỏ.
`],
  ['bua-sang','Bữa sáng và món ăn nhẹ','Bánh, trứng, sandwich và các món nhanh cho buổi sáng.',`
52854|Pancakes|Pancake mỏng ăn cùng trái cây|Anh|10|15|3|E|Bánh pancake mỏng mềm, ăn cùng quả mọng và chút đường.|Bột mì~120~g;Trứng gà~2~quả;Sữa tươi~250~ml;Dầu ăn~1~muỗng canh;Việt quất~80~g;Mâm xôi~80~g;Đường~vừa đủ|Đánh trứng, sữa và bột thành hỗn hợp mịn.;Làm nóng chảo chống dính với lớp dầu mỏng.;Đổ một lớp bột mỏng, lật khi mặt bánh se và nấu chín hai mặt.;Xếp bánh và trái cây, thêm đường tùy khẩu vị.
name|Banana Pancakes|Pancake chuối|Mỹ|10|15|3|E|Bánh pancake thơm chuối chín, mềm và ngọt tự nhiên.|Chuối~2~quả;Bột mì~150~g;Trứng gà~1~quả;Sữa tươi~150~ml;Bột nở~1~muỗng cà phê;Bơ lạt~15~g|Nghiền chuối, trộn với trứng và sữa.;Trộn bột mì, bột nở rồi khuấy vào hỗn hợp chuối vừa đủ.;Làm nóng chảo, phết bơ và múc từng bánh nhỏ.;Lật khi mặt nổi bọt, nấu đến bánh chín hai mặt.
52963|Shakshuka|Trứng nấu sốt cà chua Shakshuka|Ai Cập|10|25|3|E|Trứng nấu ngay trong sốt cà chua, ớt chuông và gia vị.|Trứng gà~4~quả;Cà chua nghiền~400~g;Ớt chuông đỏ~1~quả;Hành tây~1~củ;Tỏi~3~tép;Bột thì là Ai Cập~1~muỗng cà phê;Dầu ô liu~2~muỗng canh|Xào hành, tỏi và ớt chuông, thêm cà chua cùng gia vị.;Nấu sốt đến sệt, tạo bốn chỗ trũng.;Đập trứng vào từng chỗ, đậy nắp đến lòng trắng và lòng đỏ chín theo yêu cầu an toàn.;Dọn cùng bánh mì.
53372|Chinese Tomato Egg Stir Fry|Trứng xào cà chua|Trung Quốc|8|10|2|E|Trứng mềm xào cà chua mọng nước, dễ làm cho bữa sáng.|Trứng gà~3~quả;Cà chua~3~quả;Hành lá~2~nhánh;Dầu ăn~2~muỗng canh;Muối~vừa đủ;Đường~1~muỗng cà phê|Đánh tan trứng với chút muối, xào vừa chín rồi lấy ra.;Cắt cà chua múi cau, xào đến mềm và ra nước.;Thêm đường và trứng, đảo nhẹ đến trứng chín hoàn toàn.;Rắc hành lá.
52872|Spanish Tortilla|Trứng khoai tây Tây Ban Nha|Tây Ban Nha|15|25|4|M|Bánh trứng dày với khoai tây và hành tây mềm ngọt.|Trứng gà~5~quả;Khoai tây~500~g;Hành tây~1~củ;Dầu ô liu~3~muỗng canh;Muối~vừa đủ|Thái khoai tây và hành mỏng, nấu với dầu đến mềm.;Đánh trứng với muối, trộn khoai đã để ráo dầu.;Đổ vào chảo, nấu lửa nhỏ đến đáy chắc.;Lật bằng đĩa và nấu đến trứng chín đều.
53417|Pa Amb Tomaquet (Bread with Tomato)|Bánh mì cà chua Pa amb tomàquet|Andorra|8|5|2|E|Bánh mì giòn xoa cà chua, tỏi và dầu ô liu.|Bánh mì~4~lát;Cà chua~2~quả;Tỏi~1~tép;Dầu ô liu~2~muỗng canh;Muối~vừa đủ|Nướng bánh mì đến giòn mặt.;Xoa nhẹ tỏi lên mặt bánh.;Cắt cà chua, chà phần thịt lên bánh hoặc nghiền rồi phết.;Rưới dầu ô liu và rắc chút muối.
53075|Tortang Talong|Trứng chiên cà tím Tortang Talong|Philippines|10|25|2|E|Cà tím nướng mềm, nhúng trứng và chiên vàng.|Cà tím~2~quả;Trứng gà~3~quả;Hành lá~2~nhánh;Dầu ăn~2~muỗng canh;Muối~vừa đủ|Nướng cà tím đến mềm, bóc vỏ và giữ cuống.;Dùng nĩa dàn nhẹ cà tím trên đĩa.;Đánh trứng với hành và muối, nhúng cà tím.;Chiên từng mặt đến trứng chín vàng.
name|Breakfast Potatoes|Khoai tây áp chảo bữa sáng|Mỹ|10|25|3|E|Khoai tây khối nhỏ vàng giòn cạnh, thơm hành và paprika.|Khoai tây~500~g;Hành tây~1~củ;Ớt chuông đỏ~1~quả;Bột paprika~1~muỗng cà phê;Dầu ăn~2~muỗng canh;Muối~vừa đủ|Cắt khoai thành khối nhỏ, chần đến gần mềm.;Để khoai ráo, áp chảo với dầu đến vàng cạnh.;Thêm hành và ớt chuông thái hạt lựu, xào mềm.;Nêm paprika và muối.
name|Home-made Mandazi|Bánh Mandazi chiên|Kenya|45|20|6|M|Bánh bột chiên phồng thơm dừa và bạch đậu khấu.|Bột mì~350~g;Nước cốt dừa~180~ml;Đường~50~g;Men khô~5~g;Bạch đậu khấu~0.5~muỗng cà phê;Dầu ăn~vừa đủ|Nhào bột với nước cốt dừa, đường, men và gia vị.;Ủ đến bột nở, cán dày vừa và cắt tam giác.;Chiên từng mẻ đến bánh vàng và chín bên trong.;Để ráo dầu, dùng ấm.
52829|Grilled Mac and Cheese Sandwich|Sandwich nướng nui phô mai|Mỹ|10|20|2|E|Bánh mì nướng giòn kẹp nui phô mai nóng chảy.|Nui~100~g;Bánh mì sandwich~4~lát;Phô mai Cheddar~100~g;Sữa tươi~100~ml;Bơ lạt~25~g;Bột mì~1~muỗng canh|Luộc nui đến mềm vừa.;Nấu bơ, bột mì và sữa thành sốt, thêm Cheddar rồi trộn nui.;Kẹp nui phô mai giữa các lát bánh mì.;Áp chảo với bơ đến hai mặt vàng và nhân nóng.
`],
  ['trang-mieng','Tráng miệng','Bánh ngọt, kem, pudding và món tráng miệng.',`
53322|Flan|Bánh flan caramel|Argentina|20|40|4|M|Flan sữa trứng mềm mịn với lớp caramel màu hổ phách.|Trứng gà~4~quả;Sữa tươi~400~ml;Đường~120~g;Vani~1~muỗng cà phê|Thắng 70 g đường với chút nước thành caramel, rót vào khuôn.;Hâm sữa với phần đường còn lại, khuấy vào trứng nhẹ tay, thêm vani và lọc.;Rót hỗn hợp vào khuôn, nướng cách thủy 150°C đến bánh đông và chín.;Để nguội rồi làm lạnh trước khi úp ra đĩa.
52791|Eton Mess|Kem dâu Eton Mess|Anh|15|0|4|E|Dâu tươi trộn kem đánh bông và bánh meringue giòn.|Dâu tây~400~g;Kem tươi~300~ml;Bánh meringue~80~g;Đường~15~g;Bạc hà~vài lá|Rửa dâu, bỏ cuống, cắt nhỏ một nửa và nghiền phần còn lại.;Đánh kem lạnh với đường đến bông mềm.;Bẻ meringue thành miếng nhỏ, trộn nhẹ cùng kem và dâu.;Chia ly, trang trí bạc hà và dùng ngay.
52859|Key Lime Pie|Bánh tart chanh Key Lime|Mỹ|20|25|8|M|Đế bánh quy giòn với nhân sữa đặc và chanh chua dịu.|Bánh quy digestive~200~g;Bơ lạt~90~g;Sữa đặc~350~g;Trứng gà~3~lòng đỏ;Chanh~4~quả;Kem tươi~150~ml|Nghiền bánh quy, trộn bơ tan và ép vào khuôn, nướng 160°C 10 phút.;Đánh lòng đỏ với sữa đặc, thêm nước cốt và vỏ chanh.;Đổ nhân lên đế, nướng đến nhân đông và chín an toàn.;Để nguội, làm lạnh, phủ kem đánh bông trước khi dùng.
52858|New York cheesecake|Cheesecake New York|Mỹ|25|70|8|H|Cheesecake nướng mịn đặc, vị phô mai béo và chanh nhẹ.|Bánh quy digestive~180~g;Bơ lạt~75~g;Cream cheese~600~g;Đường~150~g;Trứng gà~3~quả;Kem chua~150~g;Chanh~1~quả|Nghiền bánh quy, trộn bơ, ép vào khuôn rồi nướng sơ.;Khuấy cream cheese với đường, thêm từng trứng, kem chua và nước chanh.;Rót vào đế, nướng 150–160°C đến rìa chắc và tâm vừa đông.;Để nguội từ từ, làm lạnh ít nhất 4 giờ.
53007|Honey Yogurt Cheesecake|Cheesecake sữa chua mật ong|Hy Lạp|20|70|8|M|Cheesecake thơm mật ong, sữa chua và vỏ cam chanh.|Bánh quy digestive~150~g;Bơ lạt~70~g;Sữa chua Hy Lạp~250~g;Phô mai mascarpone~450~g;Trứng gà~2~quả;Mật ong~100~g;Chanh~1~quả;Cam~1~quả|Ép bánh quy nghiền trộn bơ vào khuôn, nướng sơ.;Khuấy mascarpone, sữa chua, trứng, mật ong và vỏ cam chanh.;Đổ nhân vào khuôn, nướng 155°C đến bánh đông.;Làm nguội và làm lạnh, thêm chút mật ong khi dùng.
name|Apple Pie|Bánh pie táo quế|Mỹ|35|50|8|M|Bánh pie vỏ giòn với nhân táo mềm thơm quế.|Bột mì~300~g;Bơ lạt~180~g;Táo~700~g;Đường~100~g;Bột quế~1~muỗng cà phê;Chanh~1~quả;Bột bắp~1~muỗng canh|Trộn bột với bơ lạnh và ít nước lạnh, làm lạnh khối bột.;Cắt táo, trộn đường, quế, chanh và bột bắp.;Cán đế, cho nhân, phủ bột và tạo khe thoát hơi.;Nướng 190°C đến vỏ vàng và nhân táo sôi mềm.
name|Honey Cookies|Bánh quy mật ong|Quốc tế|15|15|6|E|Bánh quy vàng thơm mật ong, giòn nhẹ cạnh bánh.|Bột mì~240~g;Bơ lạt~100~g;Mật ong~70~g;Đường~40~g;Trứng gà~1~quả;Bột nở~0.5~muỗng cà phê|Đánh bơ với đường, mật ong và trứng.;Trộn bột mì và bột nở, tạo khối bột mềm.;Chia viên, ấn nhẹ trên khay lót giấy nướng.;Nướng 175°C đến viền vàng, để nguội.
name|Gingerbread Waffles|Waffle gừng quế|Quốc tế|15|20|4|E|Waffle thơm gừng, quế và mật mía, giòn bên ngoài.|Bột mì~220~g;Trứng gà~2~quả;Sữa tươi~250~ml;Bơ lạt~50~g;Mật mía~50~g;Bột gừng~1~muỗng cà phê;Bột quế~1~muỗng cà phê;Bột nở~2~muỗng cà phê|Trộn bột mì, bột nở và gia vị.;Đánh trứng với sữa, bơ tan và mật mía, trộn hai hỗn hợp.;Làm nóng máy waffle và phết dầu mỏng.;Nướng từng bánh đến vàng, chín bên trong.
name|Chocolate alfajores|Bánh Alfajores phủ chocolate|Argentina|30|20|8|M|Bánh quy kẹp dulce de leche, áo chocolate bên ngoài.|Bột mì~180~g;Bột bắp~100~g;Bơ lạt~140~g;Đường~70~g;Trứng gà~1~quả;Dulce de leche~200~g;Chocolate đen~150~g|Trộn bơ, đường, trứng rồi thêm hai loại bột, làm lạnh.;Cán và cắt bánh tròn, nướng 170°C đến vừa vàng.;Để nguội, kẹp hai bánh bằng dulce de leche.;Nhúng chocolate đun chảy, để đông trên giấy nướng.
name|Arroz con Leche Recipe|Pudding gạo sữa quế|Mỹ Latinh|10|40|4|E|Gạo nấu sữa sánh mịn, thơm quế và vỏ chanh.|Gạo~150~g;Sữa tươi~750~ml;Đường~80~g;Quế~1~thanh;Chanh~1~quả;Vani~1~muỗng cà phê|Vo gạo, nấu với sữa, quế và một ít vỏ chanh.;Khuấy thường xuyên ở lửa nhỏ đến gạo mềm.;Thêm đường và vani, tiếp tục nấu đến độ sánh mong muốn.;Bỏ quế, chia bát, dùng ấm hoặc làm lạnh.
`],
];

import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

const NAMESPACE = 'recipe-hub-demo-2026-v1';
const PASSWORD = 'RecipeHubDemo!2026'; // local demo only; RH_SEED_PASSWORD overrides it
const USERS = [
  ['Nguyễn Minh Anh', 'Thích món cơm nhà, rau theo mùa và những bữa ăn đơn giản.'],
  ['Trần Hoàng Nam', 'Khám phá món xào, món nướng và các hương vị châu Á.'],
  ['Lê Thu Hà', 'Yêu thích làm bánh, bữa sáng và món tráng miệng.'],
  ['Phạm Gia Bảo', 'Ghi lại các món nấu cuối tuần và công thức cho gia đình.'],
  ['Võ Ngọc Mai', 'Thử các món rau củ, salad và món chay dễ làm.'],
  ['Đặng Quốc Huy', 'Thích các món hầm, cà ri và nấu ăn cùng bạn bè.'],
  ['Bùi Khánh Linh', 'Sưu tầm hương vị quốc tế và món ăn nhẹ.'],
  ['Hồ Đức Thành', 'Ưu tiên các bữa ăn nhanh, có đủ rau và đạm.'],
  ['Đỗ Phương Thảo', 'Thích món nước, bún mì và những món ăn ấm áp.'],
  ['Vũ Nhật Quang', 'Khám phá các món cá, hải sản và cách nêm nếm mới.'],
].map(([displayName, bio], i) => ({
  displayName, bio: `${bio} Tài khoản giả lập dùng để kiểm thử Recipe Hub.`,
  email: `rh.demo${String(i+1).padStart(2,'0')}@example.test`,
}));
const DIFFICULTY = { E:'easy', M:'medium', H:'hard' };
const key = (s) => s.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase();
const assert = (valid, why) => { if (!valid) throw new Error(why); };
const hash = (s) => createHash('sha256').update(`${NAMESPACE}:${s}`).digest('hex');
const uuid = (s) => {
  const h = hash(s).slice(0,32).split('');
  h[12] = '4'; h[16] = ((parseInt(h[16],16) & 3) | 8).toString(16);
  const v = h.join('');
  return `${v.slice(0,8)}-${v.slice(8,12)}-${v.slice(12,16)}-${v.slice(16,20)}-${v.slice(20)}`;
};
const validText = (s,min,max) => typeof s === 'string' && s.trim().length >= min && s.length <= max && /^[^<>\p{Cc}\p{Cf}]*$/u.test(s);
function parseIngredients(raw, title) {
  const result = raw.split(';').map((s,i) => {
    const cols = s.trim().split('~').map(v=>v.trim());
    assert(cols.length===2 || cols.length===3, `${title}: invalid ingredient ${s}`);
    const [name, value, unit] = cols;
    const quantity = cols.length===3 ? Number(value) : null;
    assert(validText(name,1,100) && (quantity===null || (Number.isFinite(quantity) && quantity>=0 && quantity<=1e9)), `${title}: invalid ingredient amount ${s}`);
    assert(cols.length===3 ? validText(unit,1,32) : validText(value,1,100), `${title}: invalid ingredient unit/text ${s}`);
    return {name, quantity, unit:unit??null, quantityText:quantity===null?value:null, note:null, order:i+1};
  });
  assert(result.length>0 && result.length<=40, `${title}: ingredients count`);
  assert(new Set(result.map(x=>key(x.name))).size===result.length, `${title}: duplicate ingredient`);
  return result;
}
function parseData() {
  const rows=[];
  const cats=GROUPS.map(([slug,name,description,raw], ci)=>{
    const lines=raw.trim().split('\n').map(s=>s.trim()).filter(Boolean);
    assert(lines.length===10, `${name}: expected 10 recipes, got ${lines.length}`);
    for (const [ui,line] of lines.entries()) {
      const f=line.split('|');
      assert(f.length===11, `${name}/${ui+1}: expected 11 columns, got ${f.length}`);
      const [sourceId,sourceName,title,region,p,c,s,level,description,ing,method]=f;
      const prepMinutes=Number(p), cookMinutes=Number(c), servings=Number(s);
      const difficulty=DIFFICULTY[level];
      const ingredients=parseIngredients(ing,title);
      const steps=method.split(';').map((instruction,i)=>({order:i+1,instruction:instruction.trim(),durationMinutes:null,imageAssetId:null}));
      assert(sourceId==='name' || /^\d+$/.test(sourceId),`${title}: invalid source ID`);
      assert(validText(sourceName,1,200) && validText(title,3,150) && validText(description,10,1300),`${title}: invalid title/description`);
      assert([prepMinutes,cookMinutes].every(v=>Number.isInteger(v)&&v>=0&&v<=1440),`${title}: invalid minutes`);
      assert(Number.isInteger(servings)&&servings>=1&&servings<=100&&difficulty,`${title}: invalid servings/difficulty`);
      assert(steps.length>=1&&steps.length<=30&&steps.every(x=>validText(x.instruction,5,2000)),`${title}: invalid step(s)`);
      const tags=[name.toLowerCase(),region.toLowerCase(),...(prepMinutes+cookMinutes<=30?['nấu nhanh']:[]),...(slug==='mon-chay'?['chay']:[])];
      assert(tags.length<=12&&tags.every(t=>validText(t,1,40)),`${title}: invalid tags`);
      rows.push({ seedKey:`${slug}:${ui+1}`, categorySlug:slug, categoryName:name, userIndex:ui, sourceId,sourceName,title,region,description,prepMinutes,cookMinutes,servings,difficulty,tags,ingredients,steps });
    }
    return {slug,name,description,isActive:true,sortOrder:(ci+1)*10};
  });
  assert(USERS.length===10&&cats.length===12&&rows.length===120,'Unexpected dataset size');
  assert(new Set(rows.map(x=>key(x.title))).size===120,'Duplicate dish title');
  assert(new Set(rows.map(x=>key(x.sourceName))).size===120,'Duplicate source dish');
  assert(new Set(rows.filter(x=>x.sourceId!=='name').map(x=>x.sourceId)).size===rows.filter(x=>x.sourceId!=='name').length,'Duplicate source ID');
  for (let i=0;i<10;i++) assert(rows.filter(x=>x.userIndex===i).length===12,`Invalid user distribution ${i}`);
  const catalog = new Map();
  for (const row of rows) for (const ing of row.ingredients) {
    const k=key(ing.name);
    if (!catalog.has(k)) catalog.set(k,{name:ing.name,defaultUnit:ing.unit??'',aliases:[],group:'',isActive:true});
    else if (!catalog.get(k).defaultUnit&&ing.unit) catalog.get(k).defaultUnit=ing.unit;
  }
  return {rows,cats,catalog};
}
const DATA=parseData();

// Use official API only; source name is checked against the curated name, not a random photo.
// Some records use a verified catalogue name because an ID was not returned by the source listing.
const normMeal=(s)=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/ recipe$/,'');
const allowedHost = (u) => ['www.themealdb.com','themealdb.com'].includes(u.hostname) && u.protocol==='https:' && !u.port && !u.username && !u.password;
const apiKey=process.env.THEMEALDB_API_KEY||'1';
async function getBytes(url,maxBytes,timeout=30000) {
  let current=new URL(url);
  for (let hop=0;hop<4;hop++) {
    assert(allowedHost(current),'Unexpected external image/API host');
    const res=await fetch(current,{redirect:'manual',signal:AbortSignal.timeout(timeout),headers:{'User-Agent':'RecipeHub-educational-seed/1.0'}});
    if ([301,302,303,307,308].includes(res.status)) {
      const loc=res.headers.get('location'); await res.body?.cancel();
      assert(loc,'Redirect missing location'); current=new URL(loc,current); continue;
    }
    if (!res.ok) { await res.body?.cancel(); const e=new Error(`TheMealDB HTTP ${res.status}`); e.httpStatus=res.status; throw e; }
    const length=Number(res.headers.get('content-length')||0);
    if (length>maxBytes) { await res.body?.cancel(); throw new Error('TheMealDB response exceeds size limit'); }
    assert(res.body,'Empty HTTP response');
    const reader=res.body.getReader(), chunks=[]; let size=0;
    try {
      for (;;) { const {done,value}=await reader.read(); if(done) break; size+=value.length;
        if(size>maxBytes) { await reader.cancel(); throw new Error('TheMealDB response exceeds size limit'); }
        chunks.push(Buffer.from(value));
      }
    } finally { reader.releaseLock(); }
    assert(size>0,'Empty response body');
    return Buffer.concat(chunks,size);
  }
  throw new Error('Too many redirects');
}
async function retry(fn) {
  for(let attempt=0;attempt<3;attempt++) {
    try { return await fn(); } catch(e) {
      if(attempt===2||(e.httpStatus&&e.httpStatus<500&&e.httpStatus!==429&&e.httpStatus!==408)) throw e;
      await sleep(1500*(attempt+1));
    }
  }
}
async function sourceFor(row) {
  assert(/^[A-Za-z0-9_-]+$/.test(apiKey),'Invalid THEMEALDB_API_KEY');
  const path=row.sourceId==='name'?`search.php?s=${encodeURIComponent(row.sourceName)}`:`lookup.php?i=${row.sourceId}`;
  const url=`https://www.themealdb.com/api/json/v1/${apiKey}/${path}`;
  const result=JSON.parse((await retry(()=>getBytes(url,2*1024*1024))).toString('utf8'));
  const exact=(result.meals??[]).filter(m=>normMeal(m.strMeal??'')===normMeal(row.sourceName)&&(row.sourceId==='name'||String(m.idMeal)===row.sourceId));
  assert(exact.length===1,`Source not uniquely matched: ${row.sourceName} (${row.sourceId})`);
  const m=exact[0], img=new URL(m.strMealThumb);
  assert(/^\d+$/.test(String(m.idMeal))&&allowedHost(img)&&/^\/images\/media\/meals\//.test(img.pathname),'Invalid meal image reference');
  return {id:String(m.idMeal),name:m.strMeal,image:img.href,credit:`https://www.themealdb.com/meal/${m.idMeal}`};
}
async function imageFor(source) {
  const buffer=await retry(()=>getBytes(source.image,5*1024*1024));
  const mime=buffer.subarray(0,3).equals(Buffer.from([255,216,255]))?'image/jpeg':
    buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':
    buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP'?'image/webp':null;
  assert(mime,'Image URL did not return a supported picture');
  return {buffer,mime};
}
const creditDescription=(row,src)=>`${row.description} Công thức thử nghiệm, thời gian và khẩu phần ước tính. Ảnh minh họa: TheMealDB, ${src.name} (ID ${src.id}) — ${src.credit}.`;
function payload(row,categoryId,ingredientIds,source) {
  return {
    title:row.title, description:creditDescription(row,source),
    coverImageAssetId:null, categoryId:String(categoryId), tags:row.tags,
    difficulty:row.difficulty, prepMinutes:row.prepMinutes,cookMinutes:row.cookMinutes,
    servings:row.servings,
    ingredients:row.ingredients.map(i=>({...i,ingredientId:ingredientIds.get(key(i.name))??null})),
    steps:row.steps.map(s=>({...s})),
  };
}
function printSummary() {
  console.log(`Dataset: ${USERS.length} test users / ${DATA.rows.length} recipes / ${DATA.cats.length} categories / ${DATA.catalog.size} unique ingredients`);
  for(const cat of DATA.cats) console.log(`  ${cat.name}: ${DATA.rows.filter(r=>r.categorySlug===cat.slug).length}`);
  for(const [i,u] of USERS.entries()) console.log(`  ${u.email} | ${u.displayName} | ${DATA.rows.filter(r=>r.userIndex===i).length} recipes`);
  console.log(`Verified catalogue IDs: ${DATA.rows.filter(r=>r.sourceId!=='name').length}; exact-name lookups at runtime: ${DATA.rows.filter(r=>r.sourceId==='name').length}`);
}
const args=process.argv.slice(2);
const allowed=new Set(['--check','--validate','--check-sources','--apply','--help','--verify-images']);
for(const arg of args) assert(allowed.has(arg)||/^--limit=\d+$/.test(arg),`Unknown flag: ${arg}`);
const limitArg=args.find(a=>a.startsWith('--limit='));
const limit=limitArg?Number(limitArg.split('=')[1]):DATA.rows.length;
assert(Number.isInteger(limit)&&limit>=1&&limit<=120,'--limit must be 1..120');
assert(['--apply','--check','--validate','--check-sources','--help'].filter(a=>args.includes(a)).length<=1,'Choose one mode');
const selected=DATA.rows.slice(0,limit);

async function validateUsingBackend() {
  const [{createRecipeSchema},{validatePublication}] = await Promise.all([
    import('../src/modules/recipes/recipe.validation.js'),
    import('../src/modules/recipes/publication.validation.js'),
  ]);
  for(const row of DATA.rows) {
    const sample={id:row.sourceId==='name'?'0':row.sourceId,name:row.sourceName,credit:'https://www.themealdb.com/api.php'};
    const body=payload(row,'000000000000000000000001',new Map(),sample);
    createRecipeSchema.parse(body);
    validatePublication({...body,steps:body.steps.map(s=>({...s,stepId:uuid(`${row.seedKey}:step:${s.order}`)}))});
  }
  console.log('Backend Zod + publication validation: all 120 recipes passed.');
}
async function checkSources() {
  const seen=new Set(); let failures=0;
  for(const [i,row] of selected.entries()) {
    try {
      const src=await sourceFor(row);
      assert(!seen.has(src.id),`Duplicate source ID ${src.id}`); seen.add(src.id);
      if(args.includes('--verify-images')) await imageFor(src);
      console.log(`[${i+1}/${selected.length}] ${row.title} => ${src.id} | ${src.image}`);
    } catch(e) { failures++; console.error(`SOURCE FAILED: ${row.title}: ${e.message}`); }
    await sleep(900);
  }
  if(failures) { console.error(`${failures} source(s) failed; no database changes made.`); process.exitCode=1; }
  else console.log(`All ${selected.length} selected source records matched. ${args.includes('--verify-images')?'Downloaded and checked image signatures.':'No image bytes downloaded.'}`);
}

async function apply() {
  // No fallback to another DB/provider. This prevents accidental production imports.
  const [{parseEnv},{createDatabase},{createUserModel},{hashPassword,verifyPassword},
    {createCategoryModel},{createIngredientModel},{createRecipeModel},{createMediaAssetModel},
    {createImageStorage},{createMediaService},{createRecipeReferences},{createMediaLifecycle},
    {createRecipeService},{createPublicationService},{createRecipeMedia}]=await Promise.all([
    import('../src/config/env.js'),import('../src/config/database.js'),
    import('../src/modules/users/user.model.js'),import('../src/modules/auth/password.js'),
    import('../src/modules/categories/category.model.js'),import('../src/modules/ingredients/ingredient.model.js'),
    import('../src/modules/recipes/recipe.model.js'),import('../src/modules/media/media-asset.model.js'),
    import('../src/integrations/image-storage/index.js'),import('../src/modules/media/media.service.js'),
    import('../src/modules/recipes/recipe-reference.js'),import('../src/modules/media/media-lifecycle.service.js'),
    import('../src/modules/recipes/recipe.service.js'),import('../src/modules/recipes/publication.service.js'),
    import('../src/modules/recipes/recipe-media.service.js'),
  ]);
  const config=parseEnv(process.env);
  assert(config.NODE_ENV==='development'&&config.DB_NAME==='recipe-hub','Only development recipe-hub database is allowed');
  const dbUri=new URL(config.MONGODB_URI);
  assert(dbUri.protocol==='mongodb:'&&['localhost','127.0.0.1','[::1]'].includes(dbUri.hostname)&&dbUri.pathname==='/recipe-hub'&&dbUri.port==='27019','Expected local MongoDB on port 27019, database recipe-hub; check backend/.env');
  assert(config.MEDIA_PROVIDER==='cloudinary'&&config.IMAGE_DELIVERY_POLICY==='authenticated'&&config.CLOUDINARY_FOLDER_MODE==='dynamic'&&config.CLOUDINARY_ASSET_FOLDER==='recipe-hub','Expected backend authenticated Cloudinary (dynamic folder mode)');
  const password=process.env.RH_SEED_PASSWORD||PASSWORD;
  assert(password.length>=12&&password.length<=128&&password.trim().length>0,'RH_SEED_PASSWORD must contain 12..128 characters');
  await validateUsingBackend();
  const database=createDatabase(config);
  try {
    await database.connect();
    const connection=database.connection;
    const User=createUserModel(connection),Category=createCategoryModel(connection),Ingredient=createIngredientModel(connection),Recipe=createRecipeModel(connection),MediaAsset=createMediaAssetModel(connection);
    await Promise.all([User,Category,Ingredient,Recipe,MediaAsset].map(m=>m.createIndexes()));
    const storage=await createImageStorage(config);
    const service=createMediaService({MediaAsset,storage,config}); service.assertEnabled();
    const lifecycle=createMediaLifecycle({MediaAsset,service,references:createRecipeReferences({Recipe,User}),config});
    const recipes=createRecipeService({Recipe,Category,Ingredient,media:{MediaAsset,service,lifecycle}});
    const publication=createPublicationService({Recipe,User,Category,Ingredient,MediaAsset});
    const imageReader=createRecipeMedia({Recipe,User,MediaAsset,publication,transport:{read:(asset,options)=>storage.readImage({publicId:asset.cloudinary.publicId,resourceType:asset.cloudinary.resourceType,deliveryType:asset.cloudinary.deliveryType,version:asset.cloudinary.version},asset.format,options)}});
    console.log('Connected to local recipe-hub. Existing non-seed records will not be deleted or overwritten.');
    // Preflight synthetic emails. Refuse collisions instead of adopting arbitrary users.
    const userIds=USERS.map(u=>new connection.base.Types.ObjectId(hash(`user:${u.email}`).slice(0,24)));
    for(let i=0;i<USERS.length;i++) {
      const u=USERS[i];
      const prior=await User.findOne({$or:[{email:u.email},{_id:userIds[i]}]}).select('+passwordHash');
      if(prior) {
        assert(String(prior._id)===String(userIds[i])&&prior.email===u.email&&prior.role==='user'&&prior.status==='active',`Seed user collision or inactive user: ${u.email}`);
        assert(await verifyPassword(prior.passwordHash,password),`Existing seed user has another password: ${u.email}. Use original RH_SEED_PASSWORD; no password was reset.`);
      }
    }
    const categoryIds=new Map();
    for(const cat of DATA.cats) {
      let row=await Category.findOne({slug:cat.slug});
      if(!row) row=await Category.create(cat);
      assert(row.isActive,`Existing category is inactive: ${cat.slug}`);
      categoryIds.set(cat.slug,row._id);
    }
    const ingredientIds=new Map();
    for(const [normalized,ing] of DATA.catalog) {
      let row=await Ingredient.findOne({$or:[{normalizedName:normalized},{lookupKeys:normalized}]});
      if(!row) row=await Ingredient.create(ing);
      assert(row.isActive,`Existing ingredient is inactive: ${ing.name}`);
      ingredientIds.set(normalized,String(row._id));
    }
    const actors=[];
    for(let i=0;i<USERS.length;i++) {
      const u=USERS[i]; let row=await User.findById(userIds[i]);
      if(!row) row=await User.create({_id:userIds[i],...u,passwordHash:await hashPassword(password),role:'user',status:'active',emailVerifiedAt:new Date(),avatarAssetId:null,preferences:{timezone:'Asia/Ho_Chi_Minh',favoriteCategoryIds:[categoryIds.get(DATA.cats[i%12].slug),categoryIds.get(DATA.cats[(i+4)%12].slug)],maxPrepMinutes:[20,30,45,60,null][i%5]}});
      actors.push({user:row});
    }
    let completed=0,skipped=0; const failures=[];
    // Sequential work: respects source/Cloudinary load and media quota; do not run two copies at once.
    for(const [i,row] of selected.entries()) {
      const actor=actors[row.userIndex], authorId=actor.user._id;
      const creationKey=uuid(`recipe:${row.seedKey}`), uploadKey=uuid(`cover:${row.seedKey}`);
      let stage='read existing';
      try {
        let existing=await Recipe.findOne({authorId,creationKey});
        if(existing) {
          assert(!existing.deletedAt&&existing.creationState==='complete'&&existing.moderationStatus==='normal', 'Seed recipe deleted, hidden or incomplete; will not override it');
          assert(existing.title===row.title,'Existing seed recipe title changed; will not override it');
        }
        if(existing?.status==='published') {
          stage='verify existing published recipe';
          assert(existing.coverImageAssetId,'Published seed recipe has no cover; will not overwrite it');
          await publication.mediaReady(existing);
          if(args.includes('--verify-images')) await imageReader.read(null,String(existing._id),String(existing.coverImageAssetId));
          skipped++;
          console.log(`[${i+1}/${selected.length}] EXISTS ${row.title}`);
          continue;
        }
        // Draft first, with no cover. A successful upload is attached through the native lifecycle.
        // If interrupted after draft creation or upload, a rerun reuses the deterministic keys.
        stage='resolve exact source';
        const src=await sourceFor(row); await sleep(900);
        const body=payload(row,categoryIds.get(row.categorySlug),ingredientIds,src);
        assert(new Set(body.ingredients.map(x=>x.ingredientId)).size===body.ingredients.length, 'Existing catalogue aliases resolve two ingredients to same ID');
        if(!existing) { stage='create draft'; existing=await recipes.create(actor,body,creationKey); }
        if(!existing.coverImageAssetId) {
          stage='find existing cover upload';
          let asset=await MediaAsset.findOne({ownerId:authorId,idempotencyKey:uploadKey});
          if(asset?.attachmentIntent) {
            stage='reconcile pending attachment';
            await lifecycle.reconcileAttachment(asset);
            existing=await recipes.get(actor,existing._id);
            asset=await MediaAsset.findById(asset._id);
          }
          if(!existing.coverImageAssetId) {
            if(!asset) {
              stage='download dish image'; const file=await imageFor(src);
              stage='upload authenticated cover'; asset=await service.uploadImage(actor,file,'recipe_cover',uploadKey);
            }
            assert(asset.status==='temporary'&&asset.uploadOutcome==='confirmed'&&asset.expiresAt>new Date()&&asset.provider==='cloudinary',`Existing upload is ${asset.status}/${asset.uploadOutcome}; requires backend media reconciliation, not blind re-upload`);
            stage='attach cover';
            await lifecycle.replaceMediaReference(actor,{assetId:String(asset._id),target:{kind:'recipe_cover',resourceId:String(existing._id)},expectedVersion:existing.version});
            existing=await recipes.get(actor,existing._id);
          }
        }
        assert(existing.coverImageAssetId,'No cover attached');
        stage='validate stable media'; await publication.mediaReady(existing);
        // Test the same authorized binary path as the app before exposing the recipe.
        stage='read actual cover'; await imageReader.read(actor,String(existing._id),String(existing.coverImageAssetId));
        stage='publish'; existing=await publication.publish(actor,String(existing._id),{version:existing.version});
        stage='verify public visibility'; assert(await publication.isPublic(existing._id),'Published recipe is not publicly visible');
        completed++;
        console.log(`[${i+1}/${selected.length}] OK ${row.title} | ${src.credit} | /recipes/${existing.slug}`);
      } catch(e) {
        failures.push({title:row.title,stage,code:e.code??'ERROR',message:String(e.message??e).slice(0,240)});
        console.error(`[${i+1}/${selected.length}] FAILED ${row.title} (${stage}): ${e.code??''} ${String(e.message??e).slice(0,240)}`);
      }
    }
    const seedKeys=DATA.rows.map(r=>uuid(`recipe:${r.seedKey}`));
    const stats=await Recipe.aggregate([{$match:{authorId:{$in:userIds},creationKey:{$in:seedKeys},status:'published',moderationStatus:'normal',deletedAt:null,creationState:'complete',coverImageAssetId:{$ne:null}}},{$group:{_id:'$authorId',count:{$sum:1}}}]);
    console.log(`\nRun result: ${completed} newly published, ${skipped} already published, ${failures.length} failed.`);
    for(let i=0;i<USERS.length;i++) console.log(`${USERS[i].email}: ${stats.find(s=>String(s._id)===String(userIds[i]))?.count??0}/12 published with cover reference`);
    if(failures.length) {
      console.error('Failed recipes (rerun to continue after resolving the reported issue):');
      console.error(JSON.stringify(failures,null,2)); process.exitCode=1;
    } else if(limit===120) {
      assert(stats.length===10&&stats.every(s=>s.count===12),'Final count does not match expected 12 per user');
      console.log('Completed 120 published seed recipes. No existing non-seed records were deleted.');
    }
  } finally { await database.close(); }
}

try {
  if(args.includes('--help')) console.log('Modes: --check (offline, default); --validate (backend Zod); --check-sources [--verify-images] [--limit=N] (read-only network); --apply [--limit=N] [--verify-images] (write local DB and Cloudinary). Run --apply only in development.');
  else if(args.includes('--apply')) { printSummary(); await apply(); }
  else if(args.includes('--validate')) { printSummary(); await validateUsingBackend(); }
  else if(args.includes('--check-sources')) { printSummary(); await checkSources(); }
  else { printSummary(); console.log('Offline dataset checks passed. No DB or network operation was executed.'); }
} catch(e) { console.error(`Seed stopped: ${e.code??''} ${e.message}`); process.exitCode=1; }
