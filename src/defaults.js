(function attachDefaults(global) {
  "use strict";

  const DEFAULT_QUESTIONS = [
    {
      id: "q-arrogance",
      order: 10,
      category: "Soi lại nhận thức",
      prompt: "Ngay hôm nay, ta có suy nghĩ ngạo mạn hoặc chủ quan với những thứ mình đang làm tốt không?",
      answerType: "boolean",
      positiveAnswer: "no",
      active: true,
      followUps: [
        { id: "f-thought", condition: "yes", type: "note", prompt: "Suy nghĩ đó là gì?" }
      ]
    },
    {
      id: "q-single-meaning",
      order: 20,
      category: "Soi lại nhận thức",
      prompt: "Trong hôm nay, có việc gì ta đang làm nhưng lại để một điều khác làm lệch ý nghĩa chính không?",
      answerType: "boolean",
      positiveAnswer: "no",
      active: true,
      followUps: [
        { id: "f-refocus", condition: "yes", type: "note", prompt: "Ta sẽ loại bỏ điều gây lệch và chỉ tập trung vào một ý nghĩa duy nhất bằng cách nào?" }
      ]
    },
    {
      id: "q-comparison",
      order: 30,
      category: "Soi lại nhận thức",
      prompt: "Hôm nay ta có so sánh mình với ai khác không?",
      answerType: "boolean",
      positiveAnswer: "neutral",
      active: true,
      followUps: [
        { id: "f-positive", condition: "yes", type: "boolean", positiveAnswer: "yes", prompt: "Sự so sánh đó có tạo ra điều tích cực không?" }
      ]
    },
    {
      id: "q-unlived-context",
      order: 40,
      category: "Soi lại nhận thức",
      prompt: "Ta có thấy mình hơn người khác trong một bối cảnh sống mà bản thân chưa từng thực sự trải qua không?",
      answerType: "boolean",
      positiveAnswer: "no",
      active: true,
      followUps: []
    },
    {
      id: "q-unverified-belief",
      order: 50,
      category: "Soi lại nhận thức",
      prompt: "Hôm nay ta có tin một người hoặc một câu nói mà chưa tự kiểm chứng độ chính xác không?",
      answerType: "boolean",
      positiveAnswer: "no",
      active: true,
      followUps: [
        { id: "f-belief", condition: "yes", type: "note", prompt: "Ta đã tin sai hoặc chưa đủ căn cứ ở điều gì? Sự thật đã kiểm chứng là gì?" }
      ]
    },
    {
      id: "q-ungrounded-success",
      order: 60,
      category: "Soi lại nhận thức",
      prompt: "Ta có nghĩ một dự án hay mục tiêu sẽ thành công dù mình chưa thật sự chạm tay vào thực tế để làm không?",
      answerType: "boolean",
      positiveAnswer: "no",
      active: true,
      followUps: [
        { id: "f-ground-now", condition: "yes", type: "note", prompt: "Ngay bây giờ, bước chạm vào thực tế nhỏ nhất mà ta có thể làm là gì?" }
      ]
    },
    {
      id: "q-outsourced-resolution",
      order: 70,
      category: "Soi lại nhận thức",
      prompt: "Hôm nay ta có bị một vấn đề chi phối đến mức phải nhờ một thứ khác giải quyết thay không?",
      answerType: "boolean",
      positiveAnswer: "no",
      active: true,
      followUps: [
        { id: "f-dependency", condition: "yes", type: "note", prompt: "Ta bị điều gì chi phối, và đã phải nhờ điều gì giải quyết?" }
      ]
    },
    {
      id: "q-imposition",
      order: 80,
      category: "Soi lại nhận thức",
      prompt: "Ta có áp đặt cách làm hoặc cách nghĩ của mình lên người khác dù hoàn cảnh sống của họ khác ta không?",
      answerType: "boolean",
      positiveAnswer: "no",
      active: true,
      followUps: [
        { id: "f-imposed-thought", condition: "yes", type: "note", prompt: "Suy nghĩ hoặc sự áp đặt đó là gì?" }
      ]
    },
    {
      id: "q-foggy-road",
      order: 90,
      category: "Soi lại nhận thức",
      prompt: "Có đoạn đường nào đang mờ mịt như bị sương che, khiến ta chỉ nhìn thấy một đoạn rất ngắn phía trước không?",
      answerType: "boolean",
      positiveAnswer: "neutral",
      active: true,
      followUps: [
        { id: "f-destination", condition: "yes", type: "note", prompt: "Đoạn đường đó đang hướng tới đâu, và cột mốc gần nhất là gì?" }
      ]
    },
    {
      id: "q-halfhearted",
      order: 100,
      category: "Soi lại nhận thức",
      prompt: "Hôm nay ta có làm điều gì hời hợt, chưa nghiêm túc trọn vẹn với nó không?",
      answerType: "boolean",
      positiveAnswer: "no",
      active: true,
      followUps: [
        { id: "f-all-in", condition: "yes", type: "note", prompt: "Ta đã làm gì hời hợt? Lần sau cần chuẩn bị và hành động thế nào để thật sự All-In 100% sức lực?" }
      ]
    },
    {
      id: "q-compassion",
      order: 110,
      category: "Soi lại nhận thức",
      prompt: "Hôm nay ta có quên cảm nhận hoàn cảnh của đối phương và đánh mất sự bao dung với họ không?",
      answerType: "boolean",
      positiveAnswer: "no",
      active: true,
      followUps: [
        { id: "f-tightness", condition: "yes", type: "note", prompt: "Điều gì khiến sự thiếu bao dung trong ta trỗi dậy?" }
      ]
    },
    {
      id: "q-arrogant-speech",
      order: 120,
      category: "Soi lại nhận thức",
      prompt: "Hôm nay ta có nói với người khác bằng giọng điệu dù chỉ hơi ngạo mạn không?",
      answerType: "boolean",
      positiveAnswer: "no",
      active: true,
      followUps: [
        { id: "f-remove-speech", condition: "yes", type: "note", prompt: "Ta sẽ bỏ cách nói đó đi bằng một cách diễn đạt nào tốt hơn?" }
      ]
    },
    {
      id: "q-beneficial-silence",
      order: 130,
      category: "Thực hành điều tốt",
      prompt: "Hôm nay ta có biết yên lặng và chỉ nói những gì có lợi cho người khác hoặc cho bản thân không?",
      answerType: "boolean",
      positiveAnswer: "yes",
      active: true,
      followUps: [
        { id: "f-unhelpful-speech", condition: "no", type: "note", prompt: "Ta đã nói điều gì không mang lại lợi ích cho người khác hoặc bản thân?" }
      ]
    },
    {
      id: "q-avoid-trivia",
      order: 140,
      category: "Thực hành điều tốt",
      prompt: "Hôm nay ta có biết yên lặng, tránh những việc vặt vãnh không đâu không?",
      answerType: "boolean",
      positiveAnswer: "yes",
      active: true,
      followUps: [
        { id: "f-trivia", condition: "no", type: "note", prompt: "Ta đã nhận việc vặt vãnh gì, và điều gì khiến ta phải nhận?" }
      ]
    },
    {
      id: "q-honesty-no-tricks",
      order: 150,
      category: "Thực hành điều tốt",
      prompt: "Hôm nay ta có thành thật và không dùng mánh khóe để làm hại người khác không?",
      answerType: "boolean",
      positiveAnswer: "yes",
      active: true,
      followUps: [
        { id: "f-trick-motive", condition: "no", type: "note", prompt: "Điều gì đã thúc đẩy ta làm vậy? Ta có hối hận và muốn sửa điều gì không?" }
      ]
    },
    {
      id: "q-straight-fair",
      order: 160,
      category: "Thực hành điều tốt",
      prompt: "Hôm nay ta có suy nghĩ ngay thẳng, công bằng và nói đúng điều mình thực sự nghĩ không?",
      answerType: "boolean",
      positiveAnswer: "yes",
      active: true,
      followUps: [
        { id: "f-not-honest", condition: "no", type: "note", prompt: "Khi nào ta đã không thành thật với suy nghĩ trong đầu? Hãy liệt kê ngắn gọn." }
      ]
    },
    {
      id: "q-proportional-endurance",
      order: 170,
      category: "Thực hành điều tốt",
      prompt: "Hôm nay ta có giữ sự chịu đựng trong giới hạn mình cho là đủ, thay vì để nó trở thành thái quá không?",
      answerType: "boolean",
      positiveAnswer: "yes",
      active: true,
      followUps: [
        { id: "f-excess-emotion", condition: "no", type: "note", prompt: "Cảm xúc nào đã khiến ta đi đến mức thái quá?" }
      ]
    },
    {
      id: "q-cleanliness",
      order: 180,
      category: "Thực hành điều tốt",
      prompt: "Hôm nay bản thân, phục trang và nơi ở của ta có sạch sẽ, gọn gàng không?",
      answerType: "boolean",
      positiveAnswer: "yes",
      active: true,
      followUps: [
        { id: "f-clutter", condition: "no", type: "note", prompt: "Điều gì đã khiến ta trở nên bừa bộn, và bước dọn nhỏ nhất là gì?" }
      ]
    }
  ];

  const DEFAULT_LIBRARY_ITEMS = [
    { id: "emotion-joy", kind: "emotion", order: 10, label: "Vui", definition: "Cảm giác sáng lên khi một điều có ý nghĩa đang diễn ra hoặc vừa được hoàn thành.", prompt: "Điều gì đã mang niềm vui đến, và ta muốn giữ lại điều gì?" },
    { id: "emotion-gratitude", kind: "emotion", order: 20, label: "Biết ơn", definition: "Sự nhận ra rằng mình đã nhận được một điều tốt đẹp từ người khác, hoàn cảnh hoặc chính nỗ lực của mình.", prompt: "Ta biết ơn ai hoặc điều gì một cách cụ thể?" },
    { id: "emotion-calm", kind: "emotion", order: 30, label: "Bình yên", definition: "Trạng thái ít bị kéo giật bởi lo lắng, đủ chậm để nhìn rõ điều đang xảy ra.", prompt: "Điều gì giúp thân và tâm ta dịu lại?" },
    { id: "emotion-hope", kind: "emotion", order: 40, label: "Hy vọng", definition: "Cảm giác rằng một khả năng tốt vẫn có thể thành hiện thực và mình còn đường để hành động.", prompt: "Hy vọng này dựa trên dấu hiệu hoặc hành động thực tế nào?" },
    { id: "emotion-pride", kind: "emotion", order: 50, label: "Tự hào", definition: "Sự ghi nhận giá trị của một nỗ lực, năng lực hoặc lựa chọn mình đã thực hiện.", prompt: "Ta tự hào về hành động cụ thể nào mà không cần hạ thấp ai khác?" },
    { id: "emotion-sadness", kind: "emotion", order: 60, label: "Buồn", definition: "Cảm giác nặng hoặc trống khi ta mất đi, thiếu đi hoặc chưa đạt được điều có ý nghĩa.", prompt: "Ta đang tiếc nuối hoặc cần được nâng đỡ ở điều gì?" },
    { id: "emotion-anger", kind: "emotion", order: 70, label: "Tức giận", definition: "Năng lượng xuất hiện khi ta cảm thấy ranh giới, giá trị hoặc sự công bằng bị xâm phạm.", prompt: "Ranh giới hay giá trị nào đang cần được nhìn lại?" },
    { id: "emotion-fear", kind: "emotion", order: 80, label: "Sợ hãi", definition: "Phản ứng trước một nguy cơ được cảm nhận, dù nguy cơ đó đang hiện hữu hay mới chỉ được dự đoán.", prompt: "Nguy cơ thật sự là gì, và phần nào mới là giả định?" },
    { id: "emotion-anxiety", kind: "emotion", order: 90, label: "Lo âu", definition: "Sự căng thẳng hướng về một điều chưa xảy ra hoặc chưa đủ rõ để mình kiểm soát.", prompt: "Điều gì nằm trong tầm hành động nhỏ nhất của ta lúc này?" },
    { id: "emotion-guilt", kind: "emotion", order: 100, label: "Áy náy", definition: "Cảm giác khó chịu khi ta cho rằng một hành động của mình đã đi lệch giá trị hoặc gây tổn hại.", prompt: "Ta có thể sửa chữa hành động nào thay vì chỉ tự trách?" },
    { id: "emotion-shame", kind: "emotion", order: 110, label: "Xấu hổ", definition: "Cảm giác muốn thu mình vì sợ toàn bộ con người mình bị đánh giá là không đủ tốt.", prompt: "Ta có thể tách một hành động chưa tốt khỏi giá trị toàn bộ con người mình không?" },
    { id: "emotion-lonely", kind: "emotion", order: 120, label: "Cô đơn", definition: "Cảm giác thiếu kết nối, thiếu được hiểu hoặc thiếu sự hiện diện có ý nghĩa.", prompt: "Ta đang cần kiểu kết nối nào, với ai, ở mức nhỏ nhất?" },
    { id: "emotion-envy", kind: "emotion", order: 130, label: "Đố kỵ", definition: "Sự khó chịu khi thấy người khác có điều mình mong muốn, thường đi cùng một nhu cầu chưa được gọi tên.", prompt: "Điều ta thật sự mong muốn là gì, và có bước lành mạnh nào để tiến gần nó?" },
    { id: "emotion-frustration", kind: "emotion", order: 140, label: "Bực bội", definition: "Cảm giác bị cản trở khi nỗ lực chưa tạo ra kết quả hoặc một nhu cầu chưa được đáp ứng.", prompt: "Trở ngại cụ thể nằm ở đâu: cách làm, nguồn lực hay kỳ vọng?" },

    { id: "imagery-breakthrough", kind: "imagery", order: 10, label: "Bứt phá", definition: "Hình tượng phá qua một giới hạn cũ bằng một bước tiến rõ ràng, không chỉ bằng cảm giác hưng phấn.", prompt: "Giới hạn cụ thể nào cần bị phá vỡ?" },
    { id: "imagery-courage", kind: "imagery", order: 20, label: "Dũng cảm", definition: "Vẫn hành động theo điều có giá trị dù sợ hãi còn hiện diện.", prompt: "Nỗi sợ nào sẽ được mang theo thay vì chờ nó biến mất?" },
    { id: "imagery-clarity", kind: "imagery", order: 30, label: "Sáng rõ", definition: "Nhìn thấy điều quan trọng, điều chưa biết và bước tiếp theo mà không tô hồng.", prompt: "Điều gì cần được làm rõ bằng bằng chứng?" },
    { id: "imagery-focus", kind: "imagery", order: 40, label: "Tập trung", definition: "Dồn sự chú ý vào một mục tiêu có ý nghĩa và chủ động bỏ bớt nhiễu.", prompt: "Một điều duy nhất cần được bảo vệ là gì?" },
    { id: "imagery-discipline", kind: "imagery", order: 50, label: "Kỷ luật", definition: "Lặp lại hành động đã chọn kể cả khi cảm hứng thay đổi.", prompt: "Nhịp lặp nhỏ nào có thể giữ được lâu?" },
    { id: "imagery-resilience", kind: "imagery", order: 60, label: "Bền bỉ", definition: "Hấp thụ va chạm, học từ nó rồi tiếp tục mà không phủ nhận giới hạn.", prompt: "Sau va chạm, ta sẽ phục hồi bằng điều gì?" },
    { id: "imagery-integrity", kind: "imagery", order: 70, label: "Chính trực", definition: "Lời nói, lựa chọn và hành động nhất quán với giá trị mình công nhận.", prompt: "Điểm nào giữa lời nói và hành động đang cần khép lại?" },
    { id: "imagery-kindness", kind: "imagery", order: 80, label: "Bao dung", definition: "Nhìn thấy bối cảnh và phẩm giá của người khác mà vẫn giữ ranh giới lành mạnh.", prompt: "Ta có thể hiểu thêm điều gì trước khi phán xét?" },
    { id: "imagery-calm", kind: "imagery", order: 90, label: "Điềm tĩnh", definition: "Giữ đủ khoảng lặng giữa kích thích và phản ứng để lựa chọn có ý thức.", prompt: "Tín hiệu nào nhắc ta dừng lại trước khi phản ứng?" },
    { id: "imagery-craft", kind: "imagery", order: 100, label: "Chạm vào thực tế", definition: "Đưa ý tưởng ra khỏi suy đoán bằng thử nghiệm, vật liệu, người dùng hoặc công việc thật.", prompt: "Ngày mai ta sẽ chạm tay vào phần thực tế nào?" }
  ];

  const api = { DEFAULT_QUESTIONS, DEFAULT_LIBRARY_ITEMS };
  global.ATKDefaults = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
