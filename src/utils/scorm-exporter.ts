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

  function setSessionTime(ms) {
    var totalSec = Math.floor(ms / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    var timeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    setValue("cmi.core.session_time", timeStr);
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
    getSuspendData: getSuspendData,
    setSessionTime: setSessionTime
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

  function setSessionTime(ms) {
    var totalSec = Math.floor(ms / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    var timeStr = 'PT' + h + 'H' + m + 'M' + s + 'S';
    setValue("cmi.session_time", timeStr);
  }

  function setProgressMeasure(value) {
    var clamped = Math.min(1, Math.max(0, value));
    setValue("cmi.progress_measure", clamped.toFixed(4));
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
    getSuspendData: getSuspendData,
    setSessionTime: setSessionTime,
    setProgressMeasure: setProgressMeasure
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
      transition: s.slide.transition,
      isCoverSlide: s.slide.isCoverSlide,
      coverSubtitle: s.slide.coverSubtitle,
      learningObjectives: s.slide.learningObjectives,
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
  var startTime = new Date();

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

    // Keyboard navigation
    if (COURSE_DATA.settings.enableKeyboardNav !== false) {
      document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowRight') { window.goNext(); }
        else if (e.key === 'ArrowLeft') { window.goPrev(); }
      });
    }
  });

  // Save state before unload
  window.addEventListener('beforeunload', function() {
    var elapsed = new Date() - startTime;
    ScormAPI.setSessionTime(elapsed);
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

    // Track progress measure (SCORM 2004)
    if (typeof ScormAPI.setProgressMeasure === 'function') {
      ScormAPI.setProgressMeasure(visitedSlides.size / totalSlides);
    }

    var container = document.getElementById('slide-content');
    var html = '';

    // Slide transition
    var transition = slide.transition || COURSE_DATA.settings.defaultTransition || 'none';
    container.className = '';
    if (transition !== 'none') {
      container.classList.add('slide-transition-' + transition);
      // Force reflow then add active class
      void container.offsetWidth;
      setTimeout(function() { container.classList.add('slide-transition-active'); }, 20);
    }

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

    // Cover slide layout
    if (slide.isCoverSlide) {
      html += '<div class="cover-slide">';
      if (slide.backgroundImage) {
        html += '<div class="cover-overlay"></div>';
      }
      html += '<div class="cover-content">';
      if (slide.title) {
        html += '<h1 class="cover-title" style="color:#fff;">' + escapeHtml(slide.title) + '</h1>';
      }
      if (slide.coverSubtitle) {
        html += '<p class="cover-subtitle">' + escapeHtml(slide.coverSubtitle) + '</p>';
      }
      html += '<p class="cover-meta">' + escapeHtml(slide.moduleTitle) + '</p>';
      html += '</div></div>';
      container.innerHTML = html;
      return;
    }

    // Title
    if (slide.title) {
      html += '<h1 style="color:' + textColor + ';font-size:2rem;font-weight:700;margin-bottom:1.5rem;">' + slide.title + '</h1>';
    }

    // Module/Lesson breadcrumb
    html += '<p style="color:' + (isDark ? '#94a3b8' : '#64748b') + ';font-size:0.75rem;margin-bottom:1rem;">' +
      escapeHtml(slide.moduleTitle) + ' &rsaquo; ' + escapeHtml(slide.lessonTitle) + '</p>';

    // Learning objectives
    if (slide.learningObjectives && slide.learningObjectives.length > 0) {
      html += '<div class="objectives-box">';
      html += '<div class="objectives-header"><span class="objectives-icon">\\u{1F3AF}</span> Learning Objectives</div>';
      html += '<ul class="objectives-list">';
      slide.learningObjectives.forEach(function(obj) {
        html += '<li class="objectives-item"><span class="objectives-check">\\u2713</span> ' + escapeHtml(obj.text) + '</li>';
      });
      html += '</ul></div>';
    }

    // Content blocks
    var isColumn = slide.layout === 'two-column';
    if (isColumn) html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;" class="two-col-grid">';

    var defaultAnim = COURSE_DATA.settings.defaultAnimation || 'none';
    slide.content.forEach(function(block, blockIndex) {
      var anim = block.animation || defaultAnim;
      if (anim && anim !== 'none') {
        var delay = block.animationDelay || (blockIndex * 150);
        html += '<div class="animated" data-animation="' + anim + '" style="animation-delay:' + delay + 'ms;">';
      }

      var d = block.data || {};
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

      } else if (block.type === 'flip-card' && d.flipCards && d.flipCards.length) {
        html += '<div class="flip-card-grid">';
        d.flipCards.forEach(function(card) {
          html += '<div class="flip-card" data-flip-id="' + card.id + '" onclick="this.classList.toggle(\\\'flipped\\\')">';
          html += '<div class="flip-card-inner">';
          html += '<div class="flip-card-front">';
          if (card.frontImage) html += '<img src="' + escapeHtml(card.frontImage) + '" alt="" class="flip-card-img"/>';
          html += '<div class="flip-card-text">' + escapeHtml(card.front) + '</div>';
          html += '</div>';
          html += '<div class="flip-card-back">';
          if (card.backImage) html += '<img src="' + escapeHtml(card.backImage) + '" alt="" class="flip-card-img"/>';
          html += '<div class="flip-card-text">' + escapeHtml(card.back) + '</div>';
          html += '</div>';
          html += '</div></div>';
        });
        html += '</div>';

      } else if (block.type === 'hotspot' && d.hotspotImage) {
        html += '<div class="hotspot-container" id="hotspot_' + block.id + '">';
        html += '<img src="' + escapeHtml(d.hotspotImage) + '" alt="" class="hotspot-img"/>';
        (d.hotspotMarkers || []).forEach(function(m) {
          html += '<button class="hotspot-dot" style="left:' + m.x + '%;top:' + m.y + '%;" data-hotspot-id="' + m.id + '" data-block-id="' + block.id + '">';
          html += '<span class="hotspot-pulse"></span></button>';
          html += '<div class="hotspot-tooltip" id="ht_' + m.id + '">';
          html += '<strong>' + escapeHtml(m.label) + '</strong>';
          if (m.description) html += '<p>' + escapeHtml(m.description) + '</p>';
          html += '</div>';
        });
        html += '</div>';

      } else if (block.type === 'accordion' && d.accordionItems && d.accordionItems.length) {
        html += '<div class="accordion" id="acc_' + block.id + '">';
        d.accordionItems.forEach(function(item) {
          html += '<div class="accordion-item" id="acci_' + item.id + '">';
          html += '<button class="accordion-header" data-acc-id="' + item.id + '">' +
            escapeHtml(item.title) + '<span class="accordion-arrow">\\u25B6</span></button>';
          html += '<div class="accordion-content"><div class="accordion-body">' + escapeHtml(item.content) + '</div></div>';
          html += '</div>';
        });
        html += '</div>';

      } else if (block.type === 'tabs' && d.tabItems && d.tabItems.length) {
        html += '<div class="tabs-container" id="tabs_' + block.id + '">';
        html += '<div class="tabs-nav">';
        d.tabItems.forEach(function(tab, ti) {
          html += '<button class="tab-btn' + (ti === 0 ? ' active' : '') + '" data-tab-id="' + tab.id + '" data-tabs-block="' + block.id + '">' +
            escapeHtml(tab.title) + '</button>';
        });
        html += '</div>';
        d.tabItems.forEach(function(tab, ti) {
          html += '<div class="tab-panel' + (ti === 0 ? ' active' : '') + '" id="tabpanel_' + tab.id + '">' +
            escapeHtml(tab.content) + '</div>';
        });
        html += '</div>';

      } else if (block.type === 'timeline' && d.timelineEvents && d.timelineEvents.length) {
        html += '<div class="timeline">';
        d.timelineEvents.forEach(function(evt, ei) {
          html += '<div class="timeline-item' + (ei % 2 === 1 ? ' timeline-right' : '') + '">';
          html += '<div class="timeline-dot"></div>';
          html += '<div class="timeline-card">';
          if (evt.date) html += '<span class="timeline-date">' + escapeHtml(evt.date) + '</span>';
          html += '<h4 class="timeline-title">' + escapeHtml(evt.title) + '</h4>';
          if (evt.description) html += '<p class="timeline-desc">' + escapeHtml(evt.description) + '</p>';
          html += '</div></div>';
        });
        html += '</div>';

      } else if (block.type === 'callout') {
        var csMap = { info: '#3b82f6', warning: '#f59e0b', tip: '#10b981', success: '#059669' };
        var csBgMap = { info: '#eff6ff', warning: '#fffbeb', tip: '#ecfdf5', success: '#ecfdf5' };
        var csIconMap = { info: '\\u2139\\uFE0F', warning: '\\u26A0\\uFE0F', tip: '\\u2728', success: '\\u2705' };
        var cStyle = d.calloutStyle || 'info';
        var cColor = csMap[cStyle] || csMap.info;
        var cBg = csBgMap[cStyle] || csBgMap.info;
        var cIcon = csIconMap[cStyle] || csIconMap.info;
        html += '<div class="callout" style="border-left:4px solid ' + cColor + ';background:' + cBg + ';">';
        html += '<div class="callout-header"><span class="callout-icon">' + cIcon + '</span>';
        if (d.calloutTitle) html += '<strong>' + escapeHtml(d.calloutTitle) + '</strong>';
        html += '</div>';
        if (block.content) html += '<div class="callout-body">' + block.content + '</div>';
        html += '</div>';

      } else if (block.type === 'table' && d.tableHeaders) {
        html += '<div class="table-wrapper"><table class="scorm-table' + (d.tableStriped ? ' striped' : '') + '">';
        html += '<thead><tr>';
        d.tableHeaders.forEach(function(h) { html += '<th>' + escapeHtml(h) + '</th>'; });
        html += '</tr></thead><tbody>';
        (d.tableRows || []).forEach(function(row) {
          html += '<tr>';
          row.forEach(function(cell) { html += '<td>' + escapeHtml(cell) + '</td>'; });
          html += '</tr>';
        });
        html += '</tbody></table></div>';

      } else if (block.type === 'button') {
        var bStyle = d.buttonStyle || 'primary';
        var bTarget = d.buttonNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
        html += '<div style="margin:1rem 0;">';
        html += '<a href="' + escapeHtml(d.buttonUrl || '#') + '" class="scorm-btn scorm-btn-' + bStyle + '"' + bTarget + '>' +
          escapeHtml(d.buttonText || 'Click here') + '</a>';
        html += '</div>';

      } else if (block.type === 'audio' && d.audioUrl) {
        html += '<div class="audio-block"><audio controls preload="metadata"><source src="' + escapeHtml(d.audioUrl) +
          '"/>Your browser does not support audio.</audio></div>';

      } else if (block.type === 'embed' && d.embedUrl) {
        var eH = d.embedHeight || 400;
        html += '<div class="embed-block"><iframe src="' + escapeHtml(d.embedUrl) +
          '" style="width:100%;height:' + eH + 'px;border:none;border-radius:0.5rem;" sandbox="allow-scripts allow-same-origin allow-popups" allowfullscreen></iframe></div>';

      } else if (block.type === 'gallery' && d.galleryImages && d.galleryImages.length) {
        var gCols = d.galleryColumns || 3;
        html += '<div class="gallery-grid" style="grid-template-columns:repeat(' + gCols + ',1fr);">';
        d.galleryImages.forEach(function(img) {
          html += '<div class="gallery-item">';
          html += '<img src="' + escapeHtml(img.url) + '" alt="' + escapeHtml(img.alt || '') + '" class="gallery-img"/>';
          if (img.caption) html += '<p class="gallery-caption">' + escapeHtml(img.caption) + '</p>';
          html += '</div>';
        });
        html += '</div>';

      } else if (block.type === 'labeled-graphic' && d.labeledImage) {
        html += '<div class="labeled-graphic-container" id="lg_' + block.id + '">';
        html += '<img src="' + escapeHtml(d.labeledImage) + '" alt="" class="labeled-graphic-img"/>';
        (d.labeledMarkers || []).forEach(function(m, mi) {
          html += '<button class="labeled-marker" style="left:' + m.x + '%;top:' + m.y + '%;background:' + (m.color || '#4f46e5') + ';" ' +
            'data-marker-id="' + m.id + '" data-block-id="' + block.id + '">' + (mi + 1) + '</button>';
          html += '<div class="labeled-tooltip" id="lt_' + m.id + '">';
          html += '<strong>' + escapeHtml(m.label) + '</strong>';
          if (m.description) html += '<p>' + escapeHtml(m.description) + '</p>';
          html += '</div>';
        });
        html += '</div>';
      }
      // Close animation wrapper if needed
      if (anim && anim !== 'none') {
        html += '</div>';
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

    // Accordion listeners
    document.querySelectorAll('.accordion-header').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var item = btn.parentElement;
        item.classList.toggle('open');
      });
    });

    // Tabs listeners
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var blockId = btn.getAttribute('data-tabs-block');
        var tabId = btn.getAttribute('data-tab-id');
        var container = document.getElementById('tabs_' + blockId);
        if (!container) return;
        container.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
        container.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
        btn.classList.add('active');
        var panel = document.getElementById('tabpanel_' + tabId);
        if (panel) panel.classList.add('active');
      });
    });

    // Hotspot listeners
    document.querySelectorAll('.hotspot-dot').forEach(function(dot) {
      dot.addEventListener('click', function(e) {
        e.stopPropagation();
        var mid = dot.getAttribute('data-hotspot-id');
        var tt = document.getElementById('ht_' + mid);
        if (!tt) return;
        var isVisible = tt.classList.contains('visible');
        // Hide all tooltips in this hotspot
        var blockId = dot.getAttribute('data-block-id');
        var parent = document.getElementById('hotspot_' + blockId);
        if (parent) parent.querySelectorAll('.hotspot-tooltip').forEach(function(t) { t.classList.remove('visible'); });
        if (!isVisible) tt.classList.add('visible');
      });
    });

    // Labeled graphic listeners
    document.querySelectorAll('.labeled-marker').forEach(function(marker) {
      marker.addEventListener('click', function(e) {
        e.stopPropagation();
        var mid = marker.getAttribute('data-marker-id');
        var tt = document.getElementById('lt_' + mid);
        if (!tt) return;
        var isVisible = tt.classList.contains('visible');
        var blockId = marker.getAttribute('data-block-id');
        var parent = document.getElementById('lg_' + blockId);
        if (parent) parent.querySelectorAll('.labeled-tooltip').forEach(function(t) { t.classList.remove('visible'); });
        if (!isVisible) tt.classList.add('visible');
      });
    });

    // Close tooltips on outside click
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.hotspot-dot') && !e.target.closest('.hotspot-tooltip')) {
        document.querySelectorAll('.hotspot-tooltip.visible').forEach(function(t) { t.classList.remove('visible'); });
      }
      if (!e.target.closest('.labeled-marker') && !e.target.closest('.labeled-tooltip')) {
        document.querySelectorAll('.labeled-tooltip.visible').forEach(function(t) { t.classList.remove('visible'); });
      }
    });

    // Drag-sort listeners
    attachDragSort();

    // Scroll-reveal: Intersection Observer for animated blocks
    if (COURSE_DATA.settings.enableScrollReveal) {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      document.querySelectorAll('.animated').forEach(function(el) {
        observer.observe(el);
      });
    } else {
      // No scroll reveal: trigger all animations immediately
      document.querySelectorAll('.animated').forEach(function(el) {
        el.classList.add('in-view');
      });
    }
  }

  function attachDragSort() {
    var dragItem = null;
    document.querySelectorAll('.drag-sort-item[draggable="true"]').forEach(function(item) {
      item.addEventListener('dragstart', function(e) {
        dragItem = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', function() {
        item.classList.remove('dragging');
        dragItem = null;
        // Update order in quizAnswers
        var qid = item.getAttribute('data-qid');
        var list = item.parentElement;
        var newOrder = [];
        list.querySelectorAll('.drag-sort-item').forEach(function(el) {
          newOrder.push(el.getAttribute('data-opt-id'));
        });
        quizAnswers[qid] = newOrder;
        // Show submit button
        var submitBtn = document.getElementById('submit_' + qid);
        if (submitBtn) submitBtn.style.display = 'inline-block';
      });
      item.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!dragItem || dragItem === item) return;
        var list = item.parentElement;
        var items = Array.from(list.querySelectorAll('.drag-sort-item'));
        var dragIdx = items.indexOf(dragItem);
        var hoverIdx = items.indexOf(item);
        if (dragIdx < hoverIdx) {
          list.insertBefore(dragItem, item.nextSibling);
        } else {
          list.insertBefore(dragItem, item);
        }
      });
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
    } else if (q.type === 'drag-sort') {
      var sortOrder = quizAnswers[q.id] || q.options.map(function(o) { return o.id; });
      html += '<div style="margin-left:2.5rem;" class="drag-sort-list" data-qid="' + q.id + '">';
      sortOrder.forEach(function(optId, si) {
        var opt = q.options.find(function(o) { return o.id === optId; });
        if (!opt) return;
        var itemBorder = '#e2e8f0';
        var itemBg = '#fff';
        if (isSubmitted) {
          var correctIdx = q.correctOrder.indexOf(optId);
          if (correctIdx === si) { itemBorder = '#10b981'; itemBg = '#ecfdf5'; }
          else { itemBorder = '#ef4444'; itemBg = '#fef2f2'; }
        }
        html += '<div class="drag-sort-item" draggable="' + (!isSubmitted) + '" data-opt-id="' + optId + '" data-qid="' + q.id + '" ' +
          'style="border:2px solid ' + itemBorder + ';background:' + itemBg + ';">';
        html += '<span class="drag-sort-handle">' + (isSubmitted ? '' : '\\u2261') + '</span>';
        html += '<span class="drag-sort-num">' + (si + 1) + '</span>';
        html += '<span>' + escapeHtml(opt.text) + '</span>';
        html += '</div>';
      });
      html += '</div>';
      if (isSubmitted) {
        html += '<div style="margin-left:2.5rem;margin-top:0.5rem;font-size:0.75rem;color:#64748b;">Correct order: ';
        q.correctOrder.forEach(function(cid, ci) {
          var copt = q.options.find(function(o) { return o.id === cid; });
          if (copt) html += (ci > 0 ? ', ' : '') + escapeHtml(copt.text);
        });
        html += '</div>';
      }
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
    if (q.type === 'drag-sort') {
      if (!Array.isArray(answer) || !q.correctOrder) return false;
      return answer.length === q.correctOrder.length && answer.every(function(id, i) { return id === q.correctOrder[i]; });
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
    // Track session time
    var elapsed = new Date() - startTime;
    ScormAPI.setSessionTime(elapsed);

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
    container.className = '';

    // Show certificate if enabled and passed
    if (COURSE_DATA.settings.showCertificate && passed) {
      var today = new Date();
      var dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      var certOrg = COURSE_DATA.settings.certificateOrg || '';
      var certTitle = COURSE_DATA.settings.certificateTitle || 'Certificate of Completion';
      var html = '<div class="certificate-wrapper">';
      html += '<div class="certificate-card">';
      html += '<div class="certificate-border">';
      html += '<div class="certificate-inner">';
      html += '<div class="certificate-badge">\\u{1F3C6}</div>';
      html += '<p class="certificate-label">' + escapeHtml(certTitle) + '</p>';
      html += '<h2 class="certificate-course">' + escapeHtml(COURSE_DATA.title) + '</h2>';
      html += '<div class="certificate-divider"></div>';
      html += '<div class="certificate-details">';
      html += '<div class="certificate-detail"><span class="certificate-detail-label">Score</span><span class="certificate-detail-value">' + scorePercent + '%</span></div>';
      html += '<div class="certificate-detail"><span class="certificate-detail-label">Date</span><span class="certificate-detail-value">' + dateStr + '</span></div>';
      if (certOrg) {
        html += '<div class="certificate-detail"><span class="certificate-detail-label">Organization</span><span class="certificate-detail-value">' + escapeHtml(certOrg) + '</span></div>';
      }
      html += '</div>';
      if (allQuestions.length > 0) {
        html += '<p class="certificate-points">' + earnedPoints + ' / ' + totalPoints + ' points earned</p>';
      }
      html += '<button class="certificate-print-btn" onclick="window.print()">\\u{1F5A8} Print Certificate</button>';
      html += '</div></div></div></div>';
      container.innerHTML = html;
    } else {
      // Standard results screen
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
    }

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

/* Flip Cards */
.flip-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}
.flip-card {
  perspective: 800px;
  height: 200px;
  cursor: pointer;
}
.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}
.flip-card.flipped .flip-card-inner {
  transform: rotateY(180deg);
}
.flip-card-front, .flip-card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  text-align: center;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}
.flip-card-front {
  background: #f8fafc;
}
.flip-card-back {
  background: ${primary};
  color: #fff;
  transform: rotateY(180deg);
}
.flip-card-img {
  max-width: 80%;
  max-height: 60%;
  object-fit: contain;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}
.flip-card-text {
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.4;
}

/* Hotspot */
.hotspot-container {
  position: relative;
  display: inline-block;
  margin: 1rem 0;
  max-width: 100%;
}
.hotspot-img {
  display: block;
  max-width: 100%;
  border-radius: 0.75rem;
}
.hotspot-dot {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${primary};
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 2;
  padding: 0;
}
.hotspot-pulse {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid ${primary};
  animation: hotspot-pulse 2s infinite;
}
@keyframes hotspot-pulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.8); opacity: 0; }
}
.hotspot-tooltip, .labeled-tooltip {
  display: none;
  position: absolute;
  background: #1e293b;
  color: #f8fafc;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.813rem;
  max-width: 220px;
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  left: 50%;
  transform: translateX(-50%);
  top: calc(100% + 10px);
  pointer-events: auto;
}
.hotspot-tooltip.visible, .labeled-tooltip.visible {
  display: block;
}
.hotspot-tooltip p, .labeled-tooltip p {
  margin: 0.25rem 0 0;
  font-weight: 400;
  opacity: 0.85;
}

/* Accordion */
.accordion {
  margin: 1rem 0;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
}
.accordion-item {
  border-bottom: 1px solid #e2e8f0;
}
.accordion-item:last-child {
  border-bottom: none;
}
.accordion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.875rem 1rem;
  background: #f8fafc;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  color: #1e293b;
  text-align: left;
  transition: background 0.15s;
}
.accordion-header:hover {
  background: #f1f5f9;
}
.accordion-arrow {
  font-size: 0.625rem;
  transition: transform 0.2s;
  color: #94a3b8;
}
.accordion-item.open .accordion-arrow {
  transform: rotate(90deg);
}
.accordion-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}
.accordion-item.open .accordion-content {
  max-height: 1000px;
}
.accordion-body {
  padding: 1rem;
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.6;
}

/* Tabs */
.tabs-container {
  margin: 1rem 0;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
}
.tabs-nav {
  display: flex;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
}
.tab-btn {
  padding: 0.75rem 1.25rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.tab-btn:hover {
  color: #1e293b;
}
.tab-btn.active {
  color: ${primary};
  border-bottom-color: ${primary};
  background: #fff;
}
.tab-panel {
  display: none;
  padding: 1.25rem;
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.6;
}
.tab-panel.active {
  display: block;
}

/* Timeline */
.timeline {
  position: relative;
  margin: 1.5rem 0;
  padding-left: 2rem;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e2e8f0;
}
.timeline-item {
  position: relative;
  margin-bottom: 1.5rem;
}
.timeline-dot {
  position: absolute;
  left: -2rem;
  top: 0.25rem;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${primary};
  border: 3px solid #fff;
  box-shadow: 0 0 0 2px ${primary};
  z-index: 1;
}
.timeline-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
}
.timeline-date {
  font-size: 0.75rem;
  color: ${primary};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.timeline-title {
  font-size: 0.938rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0.25rem 0;
}
.timeline-desc {
  font-size: 0.813rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

/* Callout */
.callout {
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  margin: 1rem 0;
}
.callout-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.938rem;
}
.callout-icon {
  font-size: 1.125rem;
}
.callout-body {
  font-size: 0.875rem;
  line-height: 1.6;
  color: inherit;
}
.callout-body p {
  margin: 0;
}

/* Table */
.table-wrapper {
  margin: 1rem 0;
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
}
.scorm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.scorm-table th {
  background: #f1f5f9;
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 2px solid #e2e8f0;
}
.scorm-table td {
  padding: 0.625rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  color: #475569;
}
.scorm-table.striped tbody tr:nth-child(even) {
  background: #f8fafc;
}

/* Button */
.scorm-btn {
  display: inline-block;
  padding: 0.625rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}
.scorm-btn-primary {
  background: ${primary};
  color: #fff;
}
.scorm-btn-primary:hover { filter: brightness(1.1); }
.scorm-btn-secondary {
  background: #f1f5f9;
  color: #1e293b;
}
.scorm-btn-secondary:hover { background: #e2e8f0; }
.scorm-btn-outline {
  background: transparent;
  border: 2px solid ${primary};
  color: ${primary};
}
.scorm-btn-outline:hover { background: ${primary}; color: #fff; }
.scorm-btn-link {
  background: transparent;
  color: ${primary};
  text-decoration: underline;
  padding-left: 0;
  padding-right: 0;
}

/* Audio */
.audio-block {
  margin: 1rem 0;
}
.audio-block audio {
  width: 100%;
  border-radius: 0.5rem;
}

/* Embed */
.embed-block {
  margin: 1rem 0;
  border-radius: 0.5rem;
  overflow: hidden;
}

/* Gallery */
.gallery-grid {
  display: grid;
  gap: 0.75rem;
  margin: 1rem 0;
}
.gallery-item {
  overflow: hidden;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}
.gallery-img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  display: block;
}
.gallery-caption {
  font-size: 0.75rem;
  color: #64748b;
  padding: 0.5rem 0.625rem;
  margin: 0;
}

/* Labeled Graphic */
.labeled-graphic-container {
  position: relative;
  display: inline-block;
  margin: 1rem 0;
  max-width: 100%;
}
.labeled-graphic-img {
  display: block;
  max-width: 100%;
  border-radius: 0.75rem;
}
.labeled-marker {
  position: absolute;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transform: translate(-50%, -50%);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  padding: 0;
}

/* Drag Sort */
.drag-sort-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.drag-sort-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.15s;
  user-select: none;
}
.drag-sort-item[draggable="true"] {
  cursor: grab;
}
.drag-sort-item.dragging {
  opacity: 0.5;
  background: #f1f5f9 !important;
}
.drag-sort-handle {
  font-size: 1.25rem;
  color: #94a3b8;
  line-height: 1;
}
.drag-sort-num {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  flex-shrink: 0;
}

/* ========= Entrance Animations ========= */
@keyframes anim-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes anim-slide-up {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes anim-slide-left {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes anim-slide-right {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes anim-zoom-in {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes anim-bounce-in {
  0% { opacity: 0; transform: scale(0.3); }
  60% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}

.animated {
  opacity: 0;
}
.animated.in-view[data-animation="fade-in"] {
  animation: anim-fade-in 0.6s ease-out forwards;
}
.animated.in-view[data-animation="slide-up"] {
  animation: anim-slide-up 0.6s ease-out forwards;
}
.animated.in-view[data-animation="slide-left"] {
  animation: anim-slide-left 0.6s ease-out forwards;
}
.animated.in-view[data-animation="slide-right"] {
  animation: anim-slide-right 0.6s ease-out forwards;
}
.animated.in-view[data-animation="zoom-in"] {
  animation: anim-zoom-in 0.5s ease-out forwards;
}
.animated.in-view[data-animation="bounce-in"] {
  animation: anim-bounce-in 0.6s ease-out forwards;
}

/* ========= Slide Transitions ========= */
.slide-transition-fade {
  opacity: 0;
  transition: opacity 0.4s ease;
}
.slide-transition-fade.slide-transition-active {
  opacity: 1;
}
.slide-transition-slide-left {
  opacity: 0;
  transform: translateX(40px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.slide-transition-slide-left.slide-transition-active {
  opacity: 1;
  transform: translateX(0);
}
.slide-transition-slide-up {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.slide-transition-slide-up.slide-transition-active {
  opacity: 1;
  transform: translateY(0);
}
.slide-transition-zoom {
  opacity: 0;
  transform: scale(0.92);
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.slide-transition-zoom.slide-transition-active {
  opacity: 1;
  transform: scale(1);
}

/* ========= Cover Slide ========= */
.cover-slide {
  position: relative;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
  border-radius: 1rem;
}
.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 100%);
  z-index: 1;
}
.cover-content {
  position: relative;
  z-index: 2;
  padding: 3rem 2rem;
}
.cover-title {
  font-size: 2.75rem;
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 0.75rem;
  text-shadow: 0 2px 12px rgba(0,0,0,0.3);
}
.cover-subtitle {
  font-size: 1.25rem;
  color: rgba(255,255,255,0.85);
  margin-bottom: 1.5rem;
  font-weight: 400;
}
.cover-meta {
  font-size: 0.875rem;
  color: rgba(255,255,255,0.6);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
}

/* ========= Learning Objectives ========= */
.objectives-box {
  background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
  border: 1px solid #bfdbfe;
  border-radius: 0.75rem;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
}
.objectives-header {
  font-weight: 700;
  font-size: 0.938rem;
  color: #1e40af;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.objectives-icon {
  font-size: 1.125rem;
}
.objectives-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.objectives-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #334155;
  line-height: 1.6;
  margin-bottom: 0.375rem;
}
.objectives-check {
  color: #10b981;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

/* ========= Completion Certificate ========= */
.certificate-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: 400px;
}
.certificate-card {
  width: 100%;
  max-width: 32rem;
}
.certificate-border {
  background: linear-gradient(135deg, ${primary}, #a855f7, #ec4899, ${primary});
  border-radius: 1rem;
  padding: 4px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
}
.certificate-inner {
  background: #fff;
  border-radius: 0.875rem;
  padding: 2.5rem 2rem;
  text-align: center;
}
.certificate-badge {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}
.certificate-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #94a3b8;
  font-weight: 700;
  margin-bottom: 0.75rem;
}
.certificate-course {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 1rem;
  line-height: 1.3;
}
.certificate-divider {
  width: 4rem;
  height: 3px;
  background: linear-gradient(90deg, ${primary}, #a855f7);
  margin: 0 auto 1.25rem;
  border-radius: 9999px;
}
.certificate-details {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.certificate-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.certificate-detail-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  font-weight: 600;
  margin-bottom: 0.125rem;
}
.certificate-detail-value {
  font-size: 0.938rem;
  font-weight: 700;
  color: #1e293b;
}
.certificate-points {
  font-size: 0.813rem;
  color: #64748b;
  margin-bottom: 1.25rem;
}
.certificate-print-btn {
  display: inline-block;
  padding: 0.625rem 1.5rem;
  background: ${primary};
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s;
}
.certificate-print-btn:hover {
  filter: brightness(1.1);
}

/* ========= Responsive / Mobile ========= */
@media (max-width: 768px) {
  #slide-wrapper {
    padding: 0.75rem;
  }
  #slide-content {
    padding: 1.25rem;
    border-radius: 0.5rem;
    max-height: calc(100vh - 8rem);
  }
  #slide-content h1 {
    font-size: 1.375rem;
  }
  #slide-content h2 {
    font-size: 1.125rem;
  }
  #slide-content p, #slide-content li {
    font-size: 0.875rem;
  }
  .flip-card-grid {
    grid-template-columns: 1fr !important;
  }
  .table-wrapper {
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .scorm-table {
    min-width: 480px;
  }
  .gallery-grid {
    grid-template-columns: 1fr 1fr !important;
  }
  .two-col-grid {
    grid-template-columns: 1fr !important;
  }
  .cover-title {
    font-size: 1.75rem;
  }
  .cover-subtitle {
    font-size: 1rem;
  }
  .certificate-inner {
    padding: 1.5rem 1rem;
  }
  .certificate-details {
    gap: 1rem;
  }
  #header h1 {
    font-size: 0.75rem;
  }
  #navigation button {
    padding: 0.375rem 0.875rem;
    font-size: 0.813rem;
  }
  .objectives-box {
    padding: 1rem;
  }
  .timeline {
    padding-left: 1.5rem;
  }
}

@media print {
  body { background: #fff; }
  #header, #navigation, #progress-container { display: none !important; }
  #slide-wrapper { padding: 0; }
  #slide-content {
    box-shadow: none;
    max-height: none;
    border-radius: 0;
  }
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
