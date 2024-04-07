export const SQLQueries = {
    GET_USER_BY_NAME: "SELECT phpbb_users.user_id, phpbb_users.user_email, phpbb_users.username, phpbb_users.user_avatar, phpbb_users.group_id AS main_group, role.secondary_group FROM phpbb_users INNER JOIN (SELECT phpbb_user_group.user_id, MAX(phpbb_user_group.group_id) as secondary_group FROM phpbb_users, phpbb_user_group WHERE phpbb_users.group_id BETWEEN 9 AND 14 AND phpbb_user_group.user_id = phpbb_users.user_id GROUP BY phpbb_user_group.user_id) AS role ON role.user_id = phpbb_users.user_id AND phpbb_users.username = ? LIMIT 1",
    GET_PLAYER_BY_NAME: "SELECT phpbb_users.user_id, phpbb_users.user_email, phpbb_users.username, phpbb_users.user_avatar, phpbb_users.group_id AS main_group, role.secondary_group FROM phpbb_users INNER JOIN (SELECT phpbb_user_group.user_id, MAX(phpbb_user_group.group_id) as secondary_group FROM phpbb_users, phpbb_user_group WHERE phpbb_users.group_id BETWEEN 2 AND 14 AND phpbb_user_group.user_id = phpbb_users.user_id GROUP BY phpbb_user_group.user_id) AS role ON role.user_id = phpbb_users.user_id AND phpbb_users.username = ? LIMIT 1",
    GET_USER:
    `SELECT phpbb_user_group.user_id AS user_id, user.username, user.user_avatar, user.group_id AS main_group, phpbb_user_group.group_id AS secondary_group, user.user_email, user.user_password
    FROM phpbb_user_group
    INNER JOIN (
        SELECT phpbb_users.user_id, phpbb_users.username, phpbb_users.user_avatar, phpbb_users.user_email, phpbb_users.group_id, phpbb_users.user_password FROM phpbb_users
    ) AS user ON user.user_id = phpbb_user_group.user_id AND phpbb_user_group.group_id BETWEEN 9 AND 14 AND user.user_email = ?`,
    GET_USER_BY_ID:
    `SELECT phpbb_user_group.user_id AS user_id, user.username, user.user_avatar, user.group_id AS main_group, phpbb_user_group.group_id AS secondary_group, user.user_email, user.user_password
    FROM phpbb_user_group
    INNER JOIN (
        SELECT phpbb_users.user_id, phpbb_users.username, phpbb_users.user_avatar, phpbb_users.user_email, phpbb_users.group_id, phpbb_users.user_password FROM phpbb_users
    ) AS user ON user.user_id = phpbb_user_group.user_id AND phpbb_user_group.group_id BETWEEN 9 AND 14 AND user.user_id = ?`,
    GET_ADMIN_LIST:
      `SELECT phpbb_user_group.user_id AS user_id, user.username, user.user_avatar, user.group_id AS main_group, phpbb_user_group.group_id AS secondary_group
      FROM phpbb_user_group
      INNER JOIN (
        SELECT phpbb_users.user_id, phpbb_users.username, phpbb_users.user_avatar, phpbb_users.user_email, phpbb_users.group_id FROM phpbb_users
      ) AS user ON user.user_id = phpbb_user_group.user_id AND user.group_id BETWEEN 9 AND 11 AND phpbb_user_group.group_id BETWEEN 9 AND 14`,
    CHANGE_MAIN_GROUP: 'UPDATE phpbb_user_group, phpbb_users SET phpbb_user_group.group_id = ?, phpbb_users.group_id = ? WHERE phpbb_user_group.user_id = phpbb_users.user_id AND phpbb_users.user_id = ?;',
    CHANGE_SECONDARY_GROUP: 'UPDATE phpbb_user_group INNER JOIN (SELECT MAX(group_id) as group_id FROM phpbb_user_group WHERE group_id BETWEEN 9 AND 14 AND user_id = ? GROUP BY user_id) AS secondary_group SET phpbb_user_group.group_id = ? WHERE phpbb_user_group.group_id = secondary_group.group_id AND user_id = ?',
    REMOVE_SECONDARY_GROUP: 'DELETE FROM phpbb_user_group WHERE phpbb_user_group.user_id = ? AND phpbb_user_group.group_id = ?',
    ADD_SECONDARY_GROUP: 'INSERT INTO phpbb_user_group (user_id, group_id) VALUES (?, ?);',
    
    GET_BANLIST: 'SELECT * FROM phpbb_samp_bans INNER JOIN (SELECT username AS admin_username, user_id, user_avatar AS admin_avatar FROM phpbb_users) AS admin_user ON phpbb_samp_bans.admin_id = admin_user.user_id LEFT JOIN (SELECT username AS banned_username, user_id FROM phpbb_users) AS banned_user ON phpbb_samp_bans.user_id = banned_user.user_id',
    
    get __banlist(): string {
      return this.GET_BANLIST as string;
    },
    
    __BAN_SEARCH_BY: function(...params: Array<string>): string {
      function __buildWhere(): string {
        return 'WHERE ' + params.map((param) => param + ' = ?').join(',');
      }
      return `${this.__banlist} ${__buildWhere()} ORDER BY banned_from DESC LIMIT ? OFFSET ?`;
    },
    
    get BAN_IP_SEARCH(): string {
      return this.__BAN_SEARCH_BY('ip');
    },
    get BAN_NICKNAME_SEARCH(): string {
      return this.__BAN_SEARCH_BY('user_nickname');
    },
    get BAN_CN_SEARCH(): string {
      return this.__BAN_SEARCH_BY('serial_cn');
    },
    get BAN_SERIALS_SEARCH(): string {
      return this.__BAN_SEARCH_BY('serial_as', 'serial_ss');
    },
    
    BAN_CHANGE_DATE: 'UPDATE phpbb_samp_bans SET banned_to = ? WHERE id = ?',
    __BAN_ADMIN_SEARCH: 'SELECT * FROM phpbb_samp_bans WHERE admin_id = ? ORDER BY banned_from DESC LIMIT ? OFFSET ?',
    
    get BAN_USERNAME_SEARCH(): string {
      return this.__BAN_SEARCH_BY('banned_username');
    },
    
    BAN_COMMENT: 'SELECT * FROM phpbb_samp_bans_comments WHERE ban_id = ? ORDER BY banned_from DESC LIMIT ? OFFSET ?',
   
    BAN_POST_COMMENT: 'INSERT INTO phpbb_samp_bans_comments (id, ban_id, commentator_id, comment_text) VALUES (NULL, ?, ?, ?)',
    BAN_PATCH_COMMENT: 'UPDATE phpbb_samp_bans_comments SET comment_text = ? WHERE id = ? LIMIT 1',
  
  } as const;