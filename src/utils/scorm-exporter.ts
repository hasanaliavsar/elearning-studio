import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Course, ScormVersion, Slide } from '../types';

function getAllSlides(course: Course): { slide: Slide; moduleTitle: string; lessonTitle: string }[] {
  const slides: { slide: Slide; moduleTitle: string; lessonTitle: string }[] = [];
  course.modules.forEach(mod => {
    mod.lessons.forEach(lesson => {
      lesson.slides.forEach(slide => {
        slides.push({ slide, moduleTitle: mod.title, lessonTitle: lesson.title });
      });
    });
  });
  return slides;
}

function generateManifest12(course: Course): string {
  const identifier = `course_${course.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${identifier}"
  version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
    http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
    http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
    <lom xmlns="http://www.imsglobal.org/xsd/imsmd_rootv1p2p1">
      <general>
        <title><langstring xml:lang="${course.language}">${escapeXml(course.title)}</langstring></title>
        <description><langstring xml:lang="${course.language}">${escapeXml(course.description)}</langstring></description>
      </general>
    </lom>
  </metadata>
  <organizations default="org_1">
    <organization identifier="org_1">
      <title>${escapeXml(course.title)}</title>
      <item identifier="item_1" identifierref="res_1">
        <title>${escapeXml(course.title)}</title>
        <adlcp:masteryscore>${course.settings.passingScore}</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_1" type="webcontent" adlcp:scormtype="sco" href="content/index.html">
      <file href="content/index.html"/>
      <file href="content/scorm-api.js"/>
      <file href="content/course-data.js"/>
      <file href="content/player.js"/>
      <file href="content/styles.css"/>
    </resource>
  </resources>
</manifest>`;
}

function generateManifest2004(course: Course): string {
  const identifier = `course_${course.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${identifier}"
  version="1.0"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
    http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
    http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd
    http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd
    http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="org_1">
    <organization identifier="org_1">
      <title>${escapeXml(course.title)}</title>
      <item identifier="item_1" identifierref="res_1">
        <title>${escapeXml(course.title)}</title>
        <imsss:sequencing>
          <imsss:deliveryControls completionSetByContent="true" objectiveSetByContent="true"/>
        </imsss:sequencing>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_1" type="webcontent" adlcp:scormType="sco" href="content/index.html">
      <file href="content/index.html"/>
      <file href="content/scorm-api.js"/>
      <file href="content/course-data.js"/>
      <file href="content/player.js"/>
      <file href="content/styles.css"/>
    </resource>
  </resources>
</manifest>`;
}

function generateScormApi12(): string {
  return `// SCORM 1.2 API Wrapper
var ScormAPI = (function() {
  var api = null;
  var initialized = false;

  function findAPI(win) {
    var attempts = 0;
    while (win && !win.API && attempts < 10) {
      if (win.parent && win.parent !== win) {
        win = win.parent;
      } else if (win.opener) {
        win = win.opener;
      } else {
        break;
      }
      attempts++;
    }
    return win ? win.API : null;
  }

  function init() {
    api = findAPI(window);
    if (api) {
      var result = api.LMSInitialize("");
      initialized = (result === "true" || result === true);
      if (initialized) {
        api.LMSSetValue("cmi.core.lesson_status", "incomplete");
        api.LMSCommit("");
      }
    }
    return initialized;
  }

  function getValue(key) {
    if (!api || !initialized) return "";
    return api.LMSGetValue(key);
  }

  function setValue(key, value) {
    if (!api || !initialized) return false;
    var result = api.LMSSetValue(key, String(value));
    return (result === "true" || result === true);
  }

  function commit() {
    if (!api || !initialized) return false;
    return api.LMSCommit("");
  }

  function finish(status) {
    if (!api || !initialized) return;
    if (status) {
      api.LMSSetValue("cmi.core.lesson_status", status);
    }
    api.LMSCommit("");
    api.LMSFinish("");
    initialized = false;
  }

  function setScore(score, min, max) {
    setValue("cmi.core.score.raw", score);
    setValue("cmi.core.score.min", min || 0);
    setValue("cmi.core.score.max", max || 100);
  }

  function setBookmark(location) {
    setValue("cmi.core.lesson_location", location);
    commit();
  }

  function getBookmark() {
    return getValue("cmi.core.lesson_location");
  }

  function setSuspendData(data) {
    setValue("cmi.suspend_data", data);
    commit();
  }

  function getSuspendData() {
    return getValue("cmi.suspend_data");
  }

  return {
    init: init,
    getValue: getValue,
    setValue: setValue,
    commit: commit,
    finish: finish,
    setScore: setScore,
    setBookmark: setBookmark,
    getBookmark: getBookmark,
    setSuspendData: setSuspendData,
    getSuspendData: getSuspendData
  };
})();
`;
}

function generateScormApi2004(): string {
  return `// SCORM 2004 API Wrapper
var ScormAPI = (function() {
  var api = null;
  var initialized = false;

  function findAPI(win) {
    var attempts = 0;
    while (win && !win.API_1484_11 && attempts < 10) {
      if (win.parent && win.parent !== win) {
        win = win.parent;
      } else if (win.opener) {
        win = win.opener;
      } else {
        break;
      }
      attempts++;
    }
    return win ? win.API_1484_11 : null;
  }

  function init() {
    api = findAPI(window);
    if (api) {
      var result = api.Initialize("");
      initialized = (result === "true" || result === true);
      if (initialized) {
        api.SetValue("cmi.completion_status", "incomplete");
        api.SetValue("cmi.success_status", "unknown");
        api.Commit("");
      }
    }
    return initialized;
  }

  function getValue(key) {
    if (!api || !initialized) return "";
    return api.GetValue(key);
  }

  function setValue(key, value) {
    if (!api || !initialized) return false;
    var result = api.SetValue(key, String(value));
    return (result === "true" || result === true);
  }

  function commit() {
    if (!api || !initialized) return false;
    return api.Commit("");
  }

  function finish(status) {
    if (!api || !initialized) return;
    if (status === "passed" || status === "failed") {
      api.SetValue("cmi.success_status", status);
      api.SetValue("cmi.completion_status", "completed");
    } else if (status === "completed") {
      api.SetValue("cmi.completion_status", "completed");
    }
    api.Commit("");
    api.Terminate("");
    initialized = false;
  }

  function setScore(score, min, max) {
    setValue("cmi.score.raw", score);
    setValue("cmi.score.min", min || 0);
    setValue("cmi.score.max", max || 100);
    setValue("cmi.score.scaled", score / (max || 100));
  }

  function setBookmark(location) {
    setValue("cmi.location", location);
    commit();
  }

  function getBookmark() {
    return getValue("cmi.location");
  }

  function setSuspendData(data) {
    setValue("cmi.suspend_data", data);
    commit();
  }

  function getSuspendData() {
    return getValue("cmi.suspend_data");
  }

  return {
    init: init,
    getValue: getValue,
    setValue: setValue,
    commit: commit,
    finish: finish,
    setScore: setScore,
    setBookmark: setBookmark,
    getBookmark: getBookmark,
    setSuspendData: setSuspendData,
    getSuspendData: getSuspendData
  };
})();
`;
}

function generateCourseData(course: Course): string {
  const slides = getAllSlides(course);
  const sanitized = {
    title: course.title,
    description: course.description,
    author: course.author,
    version: course.version,
    language: course.language,
    settings: course.settings,
    slides: slides.map(s => ({
      title: s.slide.title,
      layout: s.slide.layout,
      backgroundColor: s.slide.backgroundColor,
      backgroundImage: s.slide.backgroundImage,
      moduleTitle: s.moduleTitle,
      lessonTitle: s.lessonTitle,
      content: s.slide.content,
      questions: s.slide.questions,
      duration: s.slide.duration,
    })),
  };
  return `var COURSE_DATA = ${JSON.stringify(sanitized, null, 2)};`;
}

function generatePlayer(): string {
  return `// Course Player
(function() {
  var currentSlide = 0;
  var totalSlides = COURSE_DATA.slides.length;
  var quizAnswers = {};
  var submittedQuizzes = {};
  var visitedSlides = new Set();

  // Initialize
  window.addEventListener('load', function() {
    ScormAPI.init();

    // Restore bookmark
    var bookmark = ScormAPI.getBookmark();
    if (bookmark) {
      currentSlide = parseInt(bookmark) || 0;
    }

    // Restore suspend data
    var suspendData = ScormAPI.getSuspendData();
    if (suspendData) {
      try {
        var data = JSON.parse(suspendData);
        quizAnswers = data.quizAnswers || {};
        var visited = data.visitedSlides || [];
        visited.forEach(function(v) { visitedSlides.add(v); });
      } catch(e) {}
    }

    renderSlide();
    updateProgress();
    updateNavigation();
  });

  // Save state before unload
  window.addEventListener('beforeunload', function() {
    saveState();
  });

  function saveState() {
    ScormAPI.setBookmark(String(currentSlide));
    ScormAPI.setSuspendData(JSON.stringify({
      quizAnswers: quizAnswers,
      visitedSlides: Array.from(visitedSlides)
    }));
  }

  function renderSlide() {
    var slide = COURSE_DATA.slides[currentSlide];
    if (!slide) return;
    visitedSlides.add(currentSlide);

    var container = document.getElementById('slide-content');
    var html = '';

    // Background
    container.style.backgroundColor = slide.backgroundColor || '#ffffff';
    if (slide.backgroundImage) {
      container.style.backgroundImage = 'url(' + slide.backgroundImage + ')';
      container.style.backgroundSize = 'cover';
      container.style.backgroundPosition = 'center';
    } else {
      container.style.backgroundImage = '';
    }

    var isDark = slide.backgroundColor === '#0f172a' || slide.backgroundColor === '#1e293b';
    var textColor = isDark ? '#f8fafc' : '#1e293b';

    // Title
    if (slide.title) {
      html += '<h1 style="color:' + textColor + ';font-size:2rem;font-weight:700;margin-bottom:1.5rem;">' + slide.title + '</h1>';
    }

    // Module/Lesson breadcrumb
    html += '<p style="color:' + (isDark ? '#94a3b8' : '#64748b') + ';font-size:0.75rem;margin-bottom:1rem;">' +
      escapeHtml(slide.moduleTitle) + ' &rsaquo; ' + escapeHtml(slide.lessonTitle) + '</p>';

    // Content blocks
    var isColumn = slide.layout === 'two-column';
    if (isColumn) html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;">';

    slide.content.forEach(function(block) {
      if (block.type === 'text' || block.type === 'heading' || block.type === 'list') {
        html += '<div style="color:' + textColor + ';" class="content-block">' + block.content + '</div>';
      } else if (block.type === 'image' && block.content) {
        html += '<div style="text-align:center;margin:1rem 0;"><img src="' + escapeHtml(block.content) +
          '" alt="' + escapeHtml(block.alt || '') + '" style="max-width:100%;border-radius:0.75rem;box-shadow:0 4px 12px rgba(0,0,0,0.1);"/></div>';
      } else if (block.type === 'video' && block.content) {
        var src = block.content.replace('watch?v=', 'embed/');
        html += '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:0.75rem;margin:1rem 0;">' +
          '<iframe src="' + escapeHtml(src) + '" style="position:absolute;top:0;left:0;width:100%;height:100%;" allowfullscreen></iframe></div>';
      } else if (block.type === 'code') {
        html += '<div style="margin:1rem 0;">' + block.content + '</div>';
      } else if (block.type === 'divider') {
        html += '<hr style="margin:1.5rem 0;border-color:#e2e8f0;"/>';
      }
    });

    if (isColumn) html += '</div>';

    // Questions
    if (slide.questions && slide.questions.length > 0) {
      html += '<div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid #e2e8f0;">';
      slide.questions.forEach(function(q, qi) {
        html += renderQuestion(q, qi);
      });
      html += '</div>';
    }

    container.innerHTML = html;

    // Attach event listeners for quiz
    slide.questions && slide.questions.forEach(function(q) {
      attachQuizListeners(q);
    });
  }

  function renderQuestion(q, idx) {
    var isSubmitted = submittedQuizzes[q.id];
    var answer = quizAnswers[q.id];
    var html = '<div id="q_' + q.id + '" style="background:#fff;border-radius:0.75rem;padding:1.5rem;margin-bottom:1rem;border:1px solid #e2e8f0;">';
    html += '<div style="display:flex;align-items:flex-start;gap:0.75rem;margin-bottom:1rem;">';
    html += '<span style="background:' + (COURSE_DATA.settings.primaryColor || '#4f46e5') + ';color:#fff;width:1.75rem;height:1.75rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.875rem;font-weight:700;flex-shrink:0;">' + (idx + 1) + '</span>';
    html += '<div><p style="font-weight:500;color:#1e293b;">' + escapeHtml(q.text) + '</p>';
    html += '<p style="font-size:0.75rem;color:#94a3b8;margin-top:0.25rem;">' + q.points + ' points</p></div></div>';

    if (q.type === 'multiple-choice' || q.type === 'true-false') {
      html += '<div style="margin-left:2.5rem;">';
      q.options.forEach(function(opt) {
        var isSelected = answer === opt.id;
        var borderColor = '#e2e8f0';
        var bgColor = '#fff';
        if (isSubmitted) {
          if (opt.isCorrect) { borderColor = '#10b981'; bgColor = '#ecfdf5'; }
          else if (isSelected) { borderColor = '#ef4444'; bgColor = '#fef2f2'; }
        } else if (isSelected) {
          borderColor = COURSE_DATA.settings.primaryColor || '#4f46e5';
          bgColor = '#eef2ff';
        }
        html += '<button data-qid="' + q.id + '" data-oid="' + opt.id + '" class="quiz-option" ' +
          (isSubmitted ? 'disabled' : '') +
          ' style="display:block;width:100%;text-align:left;padding:0.75rem 1rem;border:2px solid ' + borderColor +
          ';border-radius:0.5rem;margin-bottom:0.5rem;background:' + bgColor + ';cursor:pointer;font-size:0.875rem;transition:all 0.15s;">' +
          escapeHtml(opt.text) + '</button>';
      });
      html += '</div>';
    } else if (q.type === 'fill-in-blank') {
      var inputBorder = '#e2e8f0';
      var inputBg = '#fff';
      if (isSubmitted) {
        var correct = answer && answer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
        inputBorder = correct ? '#10b981' : '#ef4444';
        inputBg = correct ? '#ecfdf5' : '#fef2f2';
      }
      html += '<div style="margin-left:2.5rem;">';
      html += '<input type="text" id="fib_' + q.id + '" data-qid="' + q.id + '" class="quiz-fib" value="' + escapeHtml(answer || '') + '"' +
        (isSubmitted ? ' disabled' : '') +
        ' placeholder="Type your answer..." style="width:100%;padding:0.5rem 0.75rem;border:2px solid ' + inputBorder +
        ';border-radius:0.5rem;font-size:0.875rem;background:' + inputBg + ';outline:none;"/>';
      if (isSubmitted && !( answer && answer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim())) {
        html += '<p style="font-size:0.875rem;color:#059669;margin-top:0.25rem;">Correct: ' + escapeHtml(q.correctAnswer) + '</p>';
      }
      html += '</div>';
    } else if (q.type === 'matching') {
      html += '<div style="margin-left:2.5rem;">';
      q.matchingPairs.forEach(function(pair) {
        html += '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">';
        html += '<span style="padding:0.5rem 0.75rem;background:#f1f5f9;border-radius:0.5rem;font-size:0.875rem;font-weight:500;min-width:8rem;">' + escapeHtml(pair.left) + '</span>';
        html += '<span style="color:#94a3b8;">&rarr;</span>';
        html += '<span style="padding:0.5rem 0.75rem;background:#eef2ff;border-radius:0.5rem;font-size:0.875rem;min-width:8rem;">' + escapeHtml(pair.right) + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    // Submit button
    if (!isSubmitted && q.type !== 'matching') {
      html += '<div style="margin-left:2.5rem;margin-top:0.75rem;">';
      html += '<button id="submit_' + q.id + '" data-qid="' + q.id + '" class="quiz-submit" ' +
        'style="padding:0.5rem 1rem;background:' + (COURSE_DATA.settings.primaryColor || '#4f46e5') +
        ';color:#fff;border:none;border-radius:0.5rem;font-size:0.875rem;cursor:pointer;display:' + (answer ? 'inline-block' : 'none') + ';">Check Answer</button>';
      html += '</div>';
    }

    // Feedback
    if (isSubmitted && COURSE_DATA.settings.showFeedback && q.explanation) {
      var qCorrect = isQuestionCorrect(q);
      html += '<div style="margin:0.75rem 0 0 2.5rem;padding:0.75rem;border-radius:0.5rem;font-size:0.875rem;background:' +
        (qCorrect ? '#ecfdf5;color:#065f46' : '#fffbeb;color:#92400e') + ';">';
      html += '<p style="font-weight:600;margin-bottom:0.25rem;">' + (qCorrect ? 'Correct!' : 'Incorrect') + '</p>';
      html += '<p>' + escapeHtml(q.explanation) + '</p></div>';
    }

    html += '</div>';
    return html;
  }

  function isQuestionCorrect(q) {
    var answer = quizAnswers[q.id];
    if (!answer) return false;
    if (q.type === 'multiple-choice' || q.type === 'true-false') {
      var correct = q.options.find(function(o) { return o.isCorrect; });
      return correct && correct.id === answer;
    }
    if (q.type === 'fill-in-blank') {
      return answer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
    }
    return false;
  }

  function attachQuizListeners(q) {
    // Option click
    document.querySelectorAll('[data-qid="' + q.id + '"].quiz-option').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (submittedQuizzes[q.id]) return;
        quizAnswers[q.id] = btn.getAttribute('data-oid');
        renderSlide();
      });
    });

    // Fill-in-blank input
    var fib = document.getElementById('fib_' + q.id);
    if (fib) {
      fib.addEventListener('input', function() {
        quizAnswers[q.id] = fib.value;
        var submitBtn = document.getElementById('submit_' + q.id);
        if (submitBtn) submitBtn.style.display = fib.value ? 'inline-block' : 'none';
      });
    }

    // Submit button
    var submitBtn = document.getElementById('submit_' + q.id);
    if (submitBtn) {
      submitBtn.addEventListener('click', function() {
        submittedQuizzes[q.id] = true;
        saveState();
        renderSlide();
      });
    }
  }

  function updateProgress() {
    var bar = document.getElementById('progress-bar');
    if (bar) {
      bar.style.width = ((currentSlide + 1) / totalSlides * 100) + '%';
    }
    var counter = document.getElementById('slide-counter');
    if (counter) {
      counter.textContent = (currentSlide + 1) + ' / ' + totalSlides;
    }
  }

  function updateNavigation() {
    var prevBtn = document.getElementById('btn-prev');
    var nextBtn = document.getElementById('btn-next');
    if (prevBtn) prevBtn.disabled = currentSlide === 0;
    if (nextBtn) {
      nextBtn.textContent = currentSlide === totalSlides - 1 ? 'Finish' : 'Next \\u203A';
    }
  }

  // Navigation
  window.goNext = function() {
    if (currentSlide < totalSlides - 1) {
      currentSlide++;
      renderSlide();
      updateProgress();
      updateNavigation();
      saveState();
    } else {
      finishCourse();
    }
  };

  window.goPrev = function() {
    if (currentSlide > 0) {
      currentSlide--;
      renderSlide();
      updateProgress();
      updateNavigation();
      saveState();
    }
  };

  function finishCourse() {
    // Calculate score
    var allQuestions = [];
    COURSE_DATA.slides.forEach(function(s) {
      if (s.questions) allQuestions = allQuestions.concat(s.questions);
    });

    var totalPoints = 0;
    var earnedPoints = 0;
    allQuestions.forEach(function(q) {
      totalPoints += q.points;
      if (isQuestionCorrect(q)) earnedPoints += q.points;
    });

    var scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100;
    var passed = scorePercent >= COURSE_DATA.settings.passingScore;

    ScormAPI.setScore(scorePercent, 0, 100);

    var allVisited = visitedSlides.size >= totalSlides;
    var criteria = COURSE_DATA.settings.completionCriteria;
    var isComplete = false;
    if (criteria === 'all-slides') isComplete = allVisited;
    else if (criteria === 'passing-score') isComplete = passed;
    else isComplete = allVisited && passed;

    if (isComplete) {
      ScormAPI.finish(passed ? 'passed' : 'completed');
    } else {
      ScormAPI.finish(passed ? 'passed' : 'failed');
    }

    // Show results
    var container = document.getElementById('slide-content');
    container.style.backgroundColor = '#fff';
    container.style.backgroundImage = '';
    var html = '<div style="text-align:center;padding:3rem;">';
    html += '<div style="width:5rem;height:5rem;border-radius:50%;background:' +
      (passed ? '#ecfdf5' : '#fef2f2') + ';display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;">';
    html += '<span style="font-size:2.5rem;">' + (passed ? '\\u2713' : '\\u2717') + '</span></div>';
    html += '<h2 style="font-size:1.5rem;font-weight:700;color:#1e293b;margin-bottom:0.5rem;">' +
      (passed ? 'Congratulations!' : 'Keep Trying!') + '</h2>';
    html += '<p style="color:#64748b;margin-bottom:1.5rem;">' +
      (passed ? 'You have successfully completed this course.' : 'You need ' + COURSE_DATA.settings.passingScore + '% to pass.') + '</p>';

    if (allQuestions.length > 0) {
      html += '<div style="background:#f8fafc;border-radius:0.75rem;padding:1.5rem;max-width:16rem;margin:0 auto;">';
      html += '<div style="font-size:2.5rem;font-weight:700;color:' + (passed ? '#059669' : '#dc2626') + ';">' + scorePercent + '%</div>';
      html += '<p style="font-size:0.875rem;color:#64748b;">' + earnedPoints + ' / ' + totalPoints + ' points</p>';
      html += '<div style="width:100%;height:0.5rem;background:#e2e8f0;border-radius:9999px;margin-top:0.75rem;">';
      html += '<div style="height:100%;border-radius:9999px;width:' + scorePercent + '%;background:' + (passed ? '#059669' : '#dc2626') + ';"></div>';
      html += '</div></div>';
    }

    html += '</div>';
    container.innerHTML = html;

    // Hide navigation
    document.getElementById('btn-prev').style.display = 'none';
    document.getElementById('btn-next').style.display = 'none';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
`;
}

function generateStyles(course: Course): string {
  const primary = course.settings.primaryColor || '#4f46e5';
  const font = course.settings.fontFamily || 'Inter';

  return `
@import url('https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: '${font}', system-ui, -apple-system, sans-serif;
  background: #0f172a;
  color: #1e293b;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: #1e293b;
  flex-shrink: 0;
}

#header h1 {
  color: #f8fafc;
  font-size: 0.875rem;
  font-weight: 600;
}

#slide-counter {
  color: #94a3b8;
  font-size: 0.875rem;
}

#progress-container {
  height: 3px;
  background: #1e293b;
  flex-shrink: 0;
}

#progress-bar {
  height: 100%;
  background: ${primary};
  transition: width 0.3s ease;
  width: 0%;
}

#slide-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  overflow: auto;
}

#slide-content {
  width: 100%;
  max-width: 56rem;
  background: #fff;
  border-radius: 1rem;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
  padding: 2.5rem;
  min-height: 400px;
  overflow: auto;
  max-height: calc(100vh - 10rem);
}

#slide-content h1 { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; line-height: 1.2; }
#slide-content h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; }
#slide-content h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
#slide-content p { margin-bottom: 0.75rem; line-height: 1.7; }
#slide-content ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
#slide-content ol { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
#slide-content li { margin-bottom: 0.25rem; }
#slide-content blockquote { border-left: 4px solid ${primary}; padding-left: 1rem; font-style: italic; color: #64748b; margin: 1rem 0; }
#slide-content pre { background: #1e293b; color: #f8fafc; border-radius: 0.5rem; padding: 1rem; overflow-x: auto; margin: 1rem 0; }
#slide-content code { font-family: 'Fira Code', monospace; font-size: 0.875rem; }
#slide-content a { color: ${primary}; text-decoration: underline; }
#slide-content img { max-width: 100%; height: auto; }

.content-block { margin-bottom: 1rem; }

#navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: #1e293b;
  flex-shrink: 0;
}

#navigation button {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
}

#btn-prev {
  background: #334155;
  color: #cbd5e1;
}

#btn-prev:hover:not(:disabled) { background: #475569; color: #f8fafc; }
#btn-prev:disabled { opacity: 0.3; cursor: not-allowed; }

#btn-next {
  background: ${primary};
  color: #fff;
}

#btn-next:hover { filter: brightness(1.1); }

.quiz-option:hover:not(:disabled) {
  border-color: ${primary} !important;
  background: #eef2ff !important;
}
`;
}

function generateIndexHtml(course: Course): string {
  return `<!DOCTYPE html>
<html lang="${course.language || 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(course.title)}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="header">
    <h1>${escapeHtml(course.title)}</h1>
    <span id="slide-counter">1 / 1</span>
  </div>
  <div id="progress-container">
    <div id="progress-bar"></div>
  </div>
  <div id="slide-wrapper">
    <div id="slide-content"></div>
  </div>
  <div id="navigation">
    <button id="btn-prev" onclick="goPrev()">&lsaquo; Previous</button>
    <button id="btn-next" onclick="goNext()">Next &rsaquo;</button>
  </div>
  <script src="scorm-api.js"></script>
  <script src="course-data.js"></script>
  <script src="player.js"></script>
</body>
</html>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function exportScorm(course: Course, version: ScormVersion, packageName?: string): Promise<void> {
  const zip = new JSZip();
  const contentFolder = zip.folder('content')!;

  // Generate manifest
  const manifest = version === '1.2' ? generateManifest12(course) : generateManifest2004(course);
  zip.file('imsmanifest.xml', manifest);

  // Generate SCORM API wrapper
  const scormApi = version === '1.2' ? generateScormApi12() : generateScormApi2004();
  contentFolder.file('scorm-api.js', scormApi);

  // Generate course data
  contentFolder.file('course-data.js', generateCourseData(course));

  // Generate player
  contentFolder.file('player.js', generatePlayer());

  // Generate styles
  contentFolder.file('styles.css', generateStyles(course));

  // Generate index.html
  contentFolder.file('index.html', generateIndexHtml(course));

  // Generate ZIP
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const filename = (packageName || course.title.replace(/[^a-z0-9]/gi, '_')) + `_SCORM_${version}.zip`;
  saveAs(blob, filename);
}
