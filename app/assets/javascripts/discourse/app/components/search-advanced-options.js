import I18n from "I18n";
import Component from "@ember/component";
import { action } from "@ember/object";
import { escapeExpression } from "discourse/lib/utilities";
import Category from "discourse/models/category";

const REGEXP_BLOCKS = /(([^" \t\n\x0B\f\r]+)?(("[^"]+")?))/g;

const REGEXP_USERNAME_PREFIX = /^(user:|@)/gi;
const REGEXP_CATEGORY_PREFIX = /^(category:|#)/gi;
const REGEXP_TAGS_PREFIX = /^(tags?:|#(?=[a-z0-9\-]+::tag))/gi;
const REGEXP_IN_PREFIX = /^(in|with):/gi;
const REGEXP_STATUS_PREFIX = /^status:/gi;
const REGEXP_MIN_POST_COUNT_PREFIX = /^min_post_count:/gi;
const REGEXP_POST_TIME_PREFIX = /^(before|after):/gi;
const REGEXP_TAGS_REPLACE = /(^(tags?:|#(?=[a-z0-9\-]+::tag))|::tag\s?$)/gi;

const REGEXP_SPECIAL_IN_LIKES_MATCH = /^in:likes$/gi;
const REGEXP_SPECIAL_IN_TITLE_MATCH = /^in:title$/gi;
const REGEXP_SPECIAL_IN_PERSONAL_MATCH = /^in:personal$/gi;
const REGEXP_SPECIAL_IN_SEEN_MATCH = /^in:seen$/gi;

const REGEXP_CATEGORY_SLUG = /^(\#[a-zA-Z0-9\-:]+)/gi;
const REGEXP_CATEGORY_ID = /^(category:[0-9]+)/gi;
const REGEXP_POST_TIME_WHEN = /^(before|after)/gi;

const IN_OPTIONS_MAPPING = { images: "with" };

const inOptionsForUsers = [
  { name: I18n.t("search.advanced.filters.unseen"), value: "unseen" },
  { name: I18n.t("search.advanced.filters.posted"), value: "posted" },
  { name: I18n.t("search.advanced.filters.created"), value: "created" },
  { name: I18n.t("search.advanced.filters.watching"), value: "watching" },
  { name: I18n.t("search.advanced.filters.tracking"), value: "tracking" },
  { name: I18n.t("search.advanced.filters.bookmarks"), value: "bookmarks" },
];

const inOptionsForAll = [
  { name: I18n.t("search.advanced.filters.first"), value: "first" },
  { name: I18n.t("search.advanced.filters.pinned"), value: "pinned" },
  { name: I18n.t("search.advanced.filters.wiki"), value: "wiki" },
  { name: I18n.t("search.advanced.filters.images"), value: "images" },
];

const statusOptions = [
  { name: I18n.t("search.advanced.statuses.open"), value: "open" },
  { name: I18n.t("search.advanced.statuses.closed"), value: "closed" },
  { name: I18n.t("search.advanced.statuses.public"), value: "public" },
  { name: I18n.t("search.advanced.statuses.archived"), value: "archived" },
  {
    name: I18n.t("search.advanced.statuses.noreplies"),
    value: "noreplies",
  },
  {
    name: I18n.t("search.advanced.statuses.single_user"),
    value: "single_user",
  },
];

const postTimeOptions = [
  { name: I18n.t("search.advanced.post.time.before"), value: "before" },
  { name: I18n.t("search.advanced.post.time.after"), value: "after" },
];

function addAdvancedSearchOptions(options) {
  inOptionsForAll.pushObjects(options.inOptionsForAll);
  inOptionsForUsers.pushObjects(options.inOptionsForUsers);
  statusOptions.pushObjects(options.statusOptions);
  postTimeOptions.pushObjects(options.postTimeOptions);
}

export default Component.extend({
  classNames: ["search-advanced-options"],
  category: null,

  init() {
    this._super(...arguments);

    this.setProperties({
      searchedTerms: {
        username: null,
        category: null,
        tags: null,
        in: null,
        special: {
          in: {
            title: false,
            likes: false,
            personal: false,
            seen: false,
          },
          all_tags: false,
        },
        status: null,
        min_post_count: null,
        time: {
          when: "before",
          days: null,
        },
      },
      inOptions: this.currentUser
        ? inOptionsForUsers.concat(inOptionsForAll)
        : inOptionsForAll,
      statusOptions: statusOptions,
      postTimeOptions: postTimeOptions,
    });
  },

  didReceiveAttrs() {
    this._super(...arguments);

    this.setSearchedTermValue("searchedTerms.username", REGEXP_USERNAME_PREFIX);
    this.setSearchedTermValueForCategory();
    this.setSearchedTermValueForTags();

    let regExpInMatch = this.inOptions.map((option) => option.value).join("|");
    const REGEXP_IN_MATCH = new RegExp(`(in|with):(${regExpInMatch})`, "i");

    this.setSearchedTermValue(
      "searchedTerms.in",
      REGEXP_IN_PREFIX,
      REGEXP_IN_MATCH
    );

    this.setSearchedTermSpecialInValue(
      "searchedTerms.special.in.likes",
      REGEXP_SPECIAL_IN_LIKES_MATCH
    );

    this.setSearchedTermSpecialInValue(
      "searchedTerms.special.in.title",
      REGEXP_SPECIAL_IN_TITLE_MATCH
    );

    this.setSearchedTermSpecialInValue(
      "searchedTerms.special.in.personal",
      REGEXP_SPECIAL_IN_PERSONAL_MATCH
    );

    this.setSearchedTermSpecialInValue(
      "searchedTerms.special.in.seen",
      REGEXP_SPECIAL_IN_SEEN_MATCH
    );

    let regExpStatusMatch = this.statusOptions
      .map((status) => status.value)
      .join("|");
    const REGEXP_STATUS_MATCH = new RegExp(
      `status:(${regExpStatusMatch})`,
      "i"
    );

    this.setSearchedTermValue(
      "searchedTerms.status",
      REGEXP_STATUS_PREFIX,
      REGEXP_STATUS_MATCH
    );
    this.setSearchedTermValueForPostTime();

    this.setSearchedTermValue(
      "searchedTerms.min_post_count",
      REGEXP_MIN_POST_COUNT_PREFIX
    );
  },

  findSearchTerms() {
    const searchTerm = escapeExpression(this.searchTerm);
    if (!searchTerm) {
      return [];
    }

    const blocks = searchTerm.match(REGEXP_BLOCKS);
    if (!blocks) {
      return [];
    }

    let result = [];
    blocks.forEach((block) => {
      if (block.length !== 0) {
        result.push(block);
      }
    });

    return result;
  },

  filterBlocks(regexPrefix) {
    const blocks = this.findSearchTerms();
    if (!blocks) {
      return [];
    }

    let result = [];
    blocks.forEach((block) => {
      if (block.search(regexPrefix) !== -1) {
        result.push(block);
      }
    });

    return result;
  },

  setSearchedTermValue(key, replaceRegEx, matchRegEx = null) {
    matchRegEx = matchRegEx || replaceRegEx;
    const match = this.filterBlocks(matchRegEx);

    let val = this.get(key);
    if (match.length !== 0) {
      const userInput = match[0].replace(replaceRegEx, "").toLowerCase();

      if (val !== userInput && userInput.length) {
        this.set(key, userInput);
      }
    } else if (val && val.length !== 0) {
      this.set(key, null);
    }
  },

  setSearchedTermSpecialInValue(key, replaceRegEx) {
    const match = this.filterBlocks(replaceRegEx);

    if (match.length !== 0) {
      if (this.get(key) !== true) {
        this.set(key, true);
      }
    } else if (this.get(key) !== false) {
      this.set(key, false);
    }
  },

  setSearchedTermValueForCategory() {
    const match = this.filterBlocks(REGEXP_CATEGORY_PREFIX);
    if (match.length !== 0) {
      const existingInput = this.get("searchedTerms.category");
      const subcategories = match[0]
        .replace(REGEXP_CATEGORY_PREFIX, "")
        .split(":");
      if (subcategories.length > 1) {
        const userInput = Category.findBySlug(
          subcategories[1],
          subcategories[0]
        );
        if (
          (!existingInput && userInput) ||
          (existingInput && userInput && existingInput.id !== userInput.id)
        ) {
          this.set("searchedTerms.category", userInput);
        }
      } else if (isNaN(subcategories)) {
        const userInput = Category.findSingleBySlug(subcategories[0]);
        if (
          (!existingInput && userInput) ||
          (existingInput && userInput && existingInput.id !== userInput.id)
        ) {
          this.set("searchedTerms.category", userInput);
        }
      } else {
        const userInput = Category.findById(subcategories[0]);
        if (
          (!existingInput && userInput) ||
          (existingInput && userInput && existingInput.id !== userInput.id)
        ) {
          this.set("searchedTerms.category", userInput);
        }
      }
    } else {
      this.set("searchedTerms.category", null);
    }
  },

  setSearchedTermValueForTags() {
    if (!this.siteSettings.tagging_enabled) {
      return;
    }

    const match = this.filterBlocks(REGEXP_TAGS_PREFIX);
    const tags = this.get("searchedTerms.tags");
    if (match.length) {
      this.set("searchedTerms.special.all_tags", match[0].includes("+"));
    }
    const containAllTags = this.get("searchedTerms.special.all_tags");

    if (match.length !== 0) {
      const joinChar = containAllTags ? "+" : ",";
      const existingInput = Array.isArray(tags) ? tags.join(joinChar) : tags;
      const userInput = match[0].replace(REGEXP_TAGS_REPLACE, "");

      if (existingInput !== userInput) {
        this.set(
          "searchedTerms.tags",
          userInput.length !== 0 ? userInput.split(joinChar) : null
        );
      }
    } else if (!tags) {
      this.set("searchedTerms.tags", null);
    }
  },

  setSearchedTermValueForPostTime() {
    const match = this.filterBlocks(REGEXP_POST_TIME_PREFIX);

    if (match.length !== 0) {
      const existingInputWhen = this.get("searchedTerms.time.when");
      const userInputWhen = match[0]
        .match(REGEXP_POST_TIME_WHEN)[0]
        .toLowerCase();
      const existingInputDays = this.get("searchedTerms.time.days");
      const userInputDays = match[0].replace(REGEXP_POST_TIME_PREFIX, "");
      const properties = {};

      if (existingInputWhen !== userInputWhen) {
        properties["searchedTerms.time.when"] = userInputWhen;
      }

      if (existingInputDays !== userInputDays) {
        properties["searchedTerms.time.days"] = userInputDays;
      }

      this.setProperties(properties);
    } else {
      this.set("searchedTerms.time.when", "before");
      this.set("searchedTerms.time.days", null);
    }
  },

  updateInRegex(regex, filter) {
    const match = this.filterBlocks(regex);
    const inFilter = this.get("searchedTerms.special.in." + filter);
    let searchTerm = this.searchTerm || "";

    if (inFilter) {
      if (match.length === 0) {
        searchTerm += ` in:${filter}`;
        this._updateSearchTerm(searchTerm);
      }
    } else if (match.length !== 0) {
      searchTerm = searchTerm.replace(match, "");
      this._updateSearchTerm(searchTerm);
    }
  },

  @action
  onChangeSearchTermMinPostCount(value) {
    this.set("searchedTerms.min_post_count", value.length ? value : null);
    this._updateSearchTermForMinPostCount();
  },

  @action
  onChangeSearchTermForIn(value) {
    this.set("searchedTerms.in", value);
    this._updateSearchTermForIn();
  },

  @action
  onChangeSearchTermForStatus(value) {
    this.set("searchedTerms.status", value);
    this._updateSearchTermForStatus();
  },

  @action
  onChangeWhenTime(time) {
    if (time) {
      this.set("searchedTerms.time.when", time);
      this._updateSearchTermForPostTime();
    }
  },

  @action
  onChangeWhenDate(date) {
    if (date) {
      this.set("searchedTerms.time.days", date.format("YYYY-MM-DD"));
      this._updateSearchTermForPostTime();
    }
  },

  @action
  onChangeSearchTermForCategory(categoryId) {
    if (categoryId) {
      const category = Category.findById(categoryId);
      this.onChangeCategory && this.onChangeCategory(category);
      this.set("searchedTerms.category", category);
    } else {
      this.onChangeCategory && this.onChangeCategory(null);
      this.set("searchedTerms.category", null);
    }

    this._updateSearchTermForCategory();
  },

  @action
  onChangeSearchTermForUsername(username) {
    this.set("searchedTerms.username", username.length ? username : null);
    this._updateSearchTermForUsername();
  },

  @action
  onChangeSearchTermForTags(tags) {
    this.set("searchedTerms.tags", tags.length ? tags : null);
    this._updateSearchTermForTags();
  },

  @action
  onChangeSearchTermForAllTags(checked) {
    this.set("searchedTerms.special.all_tags", checked);
    this._updateSearchTermForTags();
  },

  @action
  onChangeSearchTermForSpecialInLikes(checked) {
    this.set("searchedTerms.special.in.likes", checked);
    this.updateInRegex(REGEXP_SPECIAL_IN_LIKES_MATCH, "likes");
  },

  @action
  onChangeSearchTermForSpecialInPersonal(checked) {
    this.set("searchedTerms.special.in.personal", checked);
    this.updateInRegex(REGEXP_SPECIAL_IN_PERSONAL_MATCH, "personal");
  },

  @action
  onChangeSearchTermForSpecialInSeen(checked) {
    this.set("searchedTerms.special.in.seen", checked);
    this.updateInRegex(REGEXP_SPECIAL_IN_SEEN_MATCH, "seen");
  },

  @action
  onChangeSearchTermForSpecialInTitle(checked) {
    this.set("searchedTerms.special.in.title", checked);
    this.updateInRegex(REGEXP_SPECIAL_IN_TITLE_MATCH, "title");
  },

  @action
  onChangeSearchedTermField(path, updateFnName, value) {
    this.set(`searchedTerms.${path}`, value);
    this[updateFnName]();
  },

  _updateSearchTermForTags() {
    const match = this.filterBlocks(REGEXP_TAGS_PREFIX);
    const tagFilter = this.get("searchedTerms.tags");
    let searchTerm = this.searchTerm || "";
    const containAllTags = this.get("searchedTerms.special.all_tags");

    if (tagFilter && tagFilter.length !== 0) {
      const joinChar = containAllTags ? "+" : ",";
      const tags = tagFilter.join(joinChar);

      if (match.length !== 0) {
        searchTerm = searchTerm.replace(match[0], `tags:${tags}`);
      } else {
        searchTerm += ` tags:${tags}`;
      }

      this._updateSearchTerm(searchTerm);
    } else if (match.length !== 0) {
      searchTerm = searchTerm.replace(match[0], "");
      this._updateSearchTerm(searchTerm);
    }
  },

  _updateSearchTermForCategory() {
    const match = this.filterBlocks(REGEXP_CATEGORY_PREFIX);
    const categoryFilter = this.get("searchedTerms.category");
    let searchTerm = this.searchTerm || "";

    const slugCategoryMatches =
      match.length !== 0 ? match[0].match(REGEXP_CATEGORY_SLUG) : null;
    const idCategoryMatches =
      match.length !== 0 ? match[0].match(REGEXP_CATEGORY_ID) : null;
    if (categoryFilter) {
      const id = categoryFilter.id;
      const slug = categoryFilter.slug;
      if (categoryFilter.parentCategory) {
        const parentSlug = categoryFilter.parentCategory.slug;
        if (slugCategoryMatches) {
          searchTerm = searchTerm.replace(
            slugCategoryMatches[0],
            `#${parentSlug}:${slug}`
          );
        } else if (idCategoryMatches) {
          searchTerm = searchTerm.replace(
            idCategoryMatches[0],
            `category:${id}`
          );
        } else {
          searchTerm += ` #${parentSlug}:${slug}`;
        }

        this._updateSearchTerm(searchTerm);
      } else {
        if (slugCategoryMatches) {
          searchTerm = searchTerm.replace(slugCategoryMatches[0], `#${slug}`);
        } else if (idCategoryMatches) {
          searchTerm = searchTerm.replace(
            idCategoryMatches[0],
            `category:${id}`
          );
        } else {
          searchTerm += ` #${slug}`;
        }

        this._updateSearchTerm(searchTerm);
      }
    } else {
      if (slugCategoryMatches) {
        searchTerm = searchTerm.replace(slugCategoryMatches[0], "");
      }
      if (idCategoryMatches) {
        searchTerm = searchTerm.replace(idCategoryMatches[0], "");
      }

      this._updateSearchTerm(searchTerm);
    }
  },

  _updateSearchTermForUsername() {
    const match = this.filterBlocks(REGEXP_USERNAME_PREFIX);
    const userFilter = this.get("searchedTerms.username");
    let searchTerm = this.searchTerm || "";

    if (userFilter && userFilter.length !== 0) {
      if (match.length !== 0) {
        searchTerm = searchTerm.replace(match[0], `@${userFilter}`);
      } else {
        searchTerm += ` @${userFilter}`;
      }

      this._updateSearchTerm(searchTerm);
    } else if (match.length !== 0) {
      searchTerm = searchTerm.replace(match[0], "");
      this._updateSearchTerm(searchTerm);
    }
  },

  _updateSearchTermForPostTime() {
    const match = this.filterBlocks(REGEXP_POST_TIME_PREFIX);
    const timeDaysFilter = this.get("searchedTerms.time.days");
    let searchTerm = this.searchTerm || "";

    if (timeDaysFilter) {
      const when = this.get("searchedTerms.time.when");
      if (match.length !== 0) {
        searchTerm = searchTerm.replace(match[0], `${when}:${timeDaysFilter}`);
      } else {
        searchTerm += ` ${when}:${timeDaysFilter}`;
      }

      this._updateSearchTerm(searchTerm);
    } else if (match.length !== 0) {
      searchTerm = searchTerm.replace(match[0], "");
      this._updateSearchTerm(searchTerm);
    }
  },

  _updateSearchTermForIn() {
    let regExpInMatch = this.inOptions.map((option) => option.value).join("|");
    const REGEXP_IN_MATCH = new RegExp(`(in|with):(${regExpInMatch})`, "i");

    const match = this.filterBlocks(REGEXP_IN_MATCH);
    const inFilter = this.get("searchedTerms.in");
    let keyword = "in";
    if (inFilter in IN_OPTIONS_MAPPING) {
      keyword = IN_OPTIONS_MAPPING[inFilter];
    }
    let searchTerm = this.searchTerm || "";

    if (inFilter) {
      if (match.length !== 0) {
        searchTerm = searchTerm.replace(match[0], `${keyword}:${inFilter}`);
      } else {
        searchTerm += ` ${keyword}:${inFilter}`;
      }

      this._updateSearchTerm(searchTerm);
    } else if (match.length !== 0) {
      searchTerm = searchTerm.replace(match, "");
      this._updateSearchTerm(searchTerm);
    }
  },

  _updateSearchTermForStatus() {
    let regExpStatusMatch = this.statusOptions
      .map((status) => status.value)
      .join("|");
    const REGEXP_STATUS_MATCH = new RegExp(
      `status:(${regExpStatusMatch})`,
      "i"
    );

    const match = this.filterBlocks(REGEXP_STATUS_MATCH);
    const statusFilter = this.get("searchedTerms.status");
    let searchTerm = this.searchTerm || "";

    if (statusFilter) {
      if (match.length !== 0) {
        searchTerm = searchTerm.replace(match[0], `status:${statusFilter}`);
      } else {
        searchTerm += ` status:${statusFilter}`;
      }

      this._updateSearchTerm(searchTerm);
    } else if (match.length !== 0) {
      searchTerm = searchTerm.replace(match[0], "");
      this._updateSearchTerm(searchTerm);
    }
  },

  _updateSearchTermForMinPostCount() {
    const match = this.filterBlocks(REGEXP_MIN_POST_COUNT_PREFIX);
    const postsCountFilter = this.get("searchedTerms.min_post_count");
    let searchTerm = this.searchTerm || "";

    if (postsCountFilter) {
      if (match.length !== 0) {
        searchTerm = searchTerm.replace(
          match[0],
          `min_post_count:${postsCountFilter}`
        );
      } else {
        searchTerm += ` min_post_count:${postsCountFilter}`;
      }

      this._updateSearchTerm(searchTerm);
    } else if (match.length !== 0) {
      searchTerm = searchTerm.replace(match[0], "");
      this._updateSearchTerm(searchTerm);
    }
  },

  _updateSearchTerm(searchTerm) {
    this.onChangeSearchTerm(searchTerm.trim());
  },
});

export { addAdvancedSearchOptions };
