const app = new Vue({
  el: "#app",
  data: {
    // host: "http://app.local",
    // host: "https://chat.cafe2hdaily.xyz",
    host: "http://localhost:4000",
    title: "Chat",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MTYwNmZlYjBiNTg0ZWNmNGMzYWU0ZDUiLCJpYXQiOjE2MzM3MTA1NjN9.hRHUKayJn2syGM4YoyscFrEaVTosbZzO3ehTmzKH5lE",
    user: null,
    rooms: [],
    selectedRoomId: null,
    text: "test",
    messages: [],
    socket: null,
    http: null,
    typing: false,
  },
  // beforeMount() {
  //   this.initSocket();
  // },
  methods: {
    async login() {},

    async join() {
      this.http = axios.create({
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      const { data } = await this.http.get(this.host + "/api/user");
      this.user = data;

      this.initSocket();
    },
    async getRooms() {
      this.rooms = [];
    },

    async joinRoom(id) {
      console.log("roomId", id);

      this.selectedRoomId = id;

      await this.getMessages();

      this.socket.emit("channel.join", { id: this.selectedRoomId });
    },

    async getMessages() {
      const { data } = await this.http.get(this.host + "/api/messages");
      console.log(data);
      this.messages = data;
    },

    sendMessage() {
      if (this.validateInput()) {
        const message = {
          content: this.text,
          id: this.selectedRoomId,
        };
        this.socket.emit("channel.message", message);
        this.text = "";
        this.getMessages();
      }
    },

    validateInput() {
      return this.text.trim().length > 0;
    },

    async initSocket() {
      this.socket = io(this.host, {
        path: "/socket",
        reconnect: true,
        secure: true,
        transports: ["websocket", "polling"],
        query: { token: this.token },
      });

      this.joinRoom("roomId");

      this.socket.on("notification", (data) => {
        console.log("notification", data);
      });

      this.socket.on("channel.message", async (data) => {
        console.log("channel.message", data);
        await this.getMessages();
      });

      this.socket.on("channel.list.reload", async () => {
        console.log("channel.list.reload");
        await this.getMessages();
      });

      this.socket.on("channel.typing.processing", () => {
        console.log("channel.typing.processing", this.socket.typing);

        setTimeout(() => {
          this.socket.emit("channel.typing.stop");
        }, 1000);
      });

      this.socket.on("channel.typing.stop", () => {
        console.log("channel.typing.stop");
      });

      this.socket.on("channel.seen", (seen) => {
        console.log("channel.seen", seen);
      });
    },
    formatMessage(message) {
      const name = message.creator.firstName || message.creatorId;
      return {
        content: message.content,
        createdAt: message.createdAt,
        name,
      };
    },
    handleChange() {
      this.socket.emit("channel.typing.start");
      // this.socket.emit("channel.delete", { id: this.selectedRoomId });
    },
    handleSeen() {
      console.log("seen");
      this.socket.emit("channel.seen");
    },
  },
});
